import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import test from "node:test";
import {
  createTenantId,
  globalScope,
  hashIdempotencyPayload,
  type TransactionRunner
} from "@product-foundation/backend-core";
import { foundationMigrationsDirectory } from "./index.js";
import { PostgresDatabase } from "./postgres-database.js";
import { PostgresIdempotencyStore } from "./postgres-idempotency-store.js";
import { PostgresOutboxStore } from "./postgres-outbox-store.js";
import { PostgresTenantTransactionRunner } from "./postgres-tenant-transaction-runner.js";
import { runSqlMigrations } from "./run-sql-migrations.js";
import { assertTenantRelationsSecure, assertTenantRuntimeRoleSafe } from "./tenant-isolation.js";

const databaseUrl = process.env.TEST_DATABASE_URL;
const integrationTest = databaseUrl === undefined ? test.skip : test;

integrationTest(
  "PostgreSQL migrations are repeatable and transactions roll back atomically",
  async () => {
    assert.ok(databaseUrl);

    const migrationOptions = {
      connectionTimeoutMs: 5_000,
      directory: foundationMigrationsDirectory,
      lockName: `foundation-test-${crypto.randomUUID()}`,
      url: databaseUrl
    };

    await runSqlMigrations(migrationOptions);
    await runSqlMigrations(migrationOptions);

    const database = new PostgresDatabase({
      connectionTimeoutMs: 5_000,
      maxConnections: 2,
      url: databaseUrl
    });
    const runtimeRole = `foundation_runtime_${crypto.randomUUID().replaceAll("-", "")}`;
    const tenantProcedureId = "architecture.tenant-probe";
    let runtimeRoleCreated = false;

    try {
      await database.check();
      await database.query(`
        CREATE TABLE IF NOT EXISTS platform.architecture_transaction_probe (
          id uuid PRIMARY KEY
        )
      `);
      await database.query("TRUNCATE TABLE platform.architecture_transaction_probe");
      await database.query("DROP TABLE IF EXISTS platform.tenant_isolation_probe");
      await database.query(`
        CREATE TABLE platform.tenant_isolation_probe (
          id uuid PRIMARY KEY,
          tenant_id uuid NOT NULL
        )
      `);
      await assert.rejects(
        assertTenantRelationsSecure(database, [
          { schema: "platform", table: "tenant_isolation_probe" }
        ]),
        /must enable and force RLS/
      );
      await database.query("ALTER TABLE platform.tenant_isolation_probe ENABLE ROW LEVEL SECURITY");
      await database.query("ALTER TABLE platform.tenant_isolation_probe FORCE ROW LEVEL SECURITY");
      await database.query(`
        CREATE POLICY tenant_isolation_probe_scope
        ON platform.tenant_isolation_probe
        USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
        WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid)
      `);
      await assertTenantRelationsSecure(database, [
        { schema: "platform", table: "tenant_isolation_probe" }
      ]);

      await database.query(`
        CREATE ROLE ${runtimeRole}
          NOLOGIN
          NOSUPERUSER
          NOCREATEDB
          NOCREATEROLE
          NOINHERIT
          NOBYPASSRLS
      `);
      runtimeRoleCreated = true;
      await database.query(`GRANT USAGE ON SCHEMA platform TO ${runtimeRole}`);
      await database.query(
        `GRANT SELECT, INSERT, UPDATE, DELETE
         ON platform.idempotency_records, platform.tenant_isolation_probe
         TO ${runtimeRole}`
      );

      const runtimeTransactions: TransactionRunner = {
        run: (work, options) =>
          database.run(async (transaction) => {
            await transaction.query(`SET LOCAL ROLE ${runtimeRole}`);
            return work(transaction);
          }, options)
      };
      await runtimeTransactions.run((transaction) => assertTenantRuntimeRoleSafe(transaction));

      const firstTenantScope = {
        kind: "tenant" as const,
        tenantId: createTenantId("44ba2ed7-6a30-48f3-8e8b-67f89e495676")
      };
      const secondTenantScope = {
        kind: "tenant" as const,
        tenantId: createTenantId("bf031bb7-4652-4ca4-8a82-61597c98c461")
      };
      const tenantIdempotency = new PostgresIdempotencyStore(runtimeTransactions);
      const tenantTransactions = new PostgresTenantTransactionRunner(runtimeTransactions);
      const tenantRowId = crypto.randomUUID();

      assert.deepEqual(
        await tenantIdempotency.runAtomically(
          {
            key: `tenant-success-${crypto.randomUUID()}`,
            procedureId: tenantProcedureId,
            requestHash: hashIdempotencyPayload('{"value":"tenant-success"}'),
            scope: firstTenantScope
          },
          {
            ttlMs: 60_000
          },
          async (transaction) => {
            const installedScope = await transaction.query<{ tenant_id: string }>(
              "SELECT current_setting('app.tenant_id') AS tenant_id"
            );
            assert.equal(installedScope.rows[0]?.tenant_id, firstTenantScope.tenantId);
            await transaction.query(
              `INSERT INTO platform.tenant_isolation_probe (id, tenant_id)
               VALUES ($1, $2)`,
              [tenantRowId, firstTenantScope.tenantId]
            );
            return { body: { id: tenantRowId }, status: 200 };
          }
        ),
        {
          kind: "executed",
          responseBody: { id: tenantRowId },
          responseStatus: 200
        }
      );

      const visibleToFirstTenant = await tenantTransactions.run(firstTenantScope, (transaction) =>
        transaction.query<{ count: string }>(
          "SELECT count(*)::text AS count FROM platform.tenant_isolation_probe"
        )
      );
      const visibleToSecondTenant = await tenantTransactions.run(secondTenantScope, (transaction) =>
        transaction.query<{ count: string }>(
          "SELECT count(*)::text AS count FROM platform.tenant_isolation_probe"
        )
      );
      assert.equal(visibleToFirstTenant.rows[0]?.count, "1");
      assert.equal(visibleToSecondTenant.rows[0]?.count, "0");

      const rejectedIdempotencyKey = `tenant-rejected-${crypto.randomUUID()}`;
      await assert.rejects(
        tenantIdempotency.runAtomically(
          {
            key: rejectedIdempotencyKey,
            procedureId: tenantProcedureId,
            requestHash: hashIdempotencyPayload('{"value":"cross-tenant"}'),
            scope: secondTenantScope
          },
          {
            ttlMs: 60_000
          },
          async (transaction) => {
            await transaction.query(
              `INSERT INTO platform.tenant_isolation_probe (id, tenant_id)
               VALUES ($1, $2)`,
              [crypto.randomUUID(), firstTenantScope.tenantId]
            );
            return { body: { ok: true }, status: 200 };
          }
        ),
        /row-level security/
      );
      const rejectedLedger = await database.query<{ count: string }>(
        `SELECT count(*)::text AS count
         FROM platform.idempotency_records
         WHERE procedure_id = $1 AND idempotency_key = $2`,
        [tenantProcedureId, rejectedIdempotencyKey]
      );
      assert.equal(rejectedLedger.rows[0]?.count, "0");

      await assert.rejects(
        database.run(async (transaction) => {
          await transaction.query(
            "INSERT INTO platform.architecture_transaction_probe (id) VALUES ($1)",
            [crypto.randomUUID()]
          );
          throw new Error("force rollback");
        }),
        /force rollback/
      );

      const result = await database.query<{ count: string }>(
        "SELECT count(*)::text AS count FROM platform.architecture_transaction_probe"
      );
      assert.equal(result.rows[0]?.count, "0");

      const primitives = await database.query<{ table_name: string }>(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'platform'
          AND table_name IN ('idempotency_records', 'outbox_messages')
        ORDER BY table_name
      `);
      assert.deepEqual(
        primitives.rows.map((row) => row.table_name),
        ["idempotency_records", "outbox_messages"]
      );

      const migrationJournal = await database.query<{ count: string }>(`
        SELECT count(*)::text AS count
        FROM platform.schema_migrations
        WHERE namespace = 'foundation'
      `);
      const expectedMigrationCount = (await readdir(foundationMigrationsDirectory)).filter((file) =>
        file.endsWith(".sql")
      ).length;
      assert.equal(migrationJournal.rows[0]?.count, String(expectedMigrationCount));

      const idempotency = new PostgresIdempotencyStore(database);
      const idempotencyKey = {
        key: `test-${crypto.randomUUID()}`,
        procedureId: "architecture.probe",
        requestHash: hashIdempotencyPayload('{"value":1}'),
        scope: globalScope
      };

      const mutationRowId = crypto.randomUUID();
      assert.deepEqual(
        await idempotency.runAtomically(
          idempotencyKey,
          {
            ttlMs: 60_000
          },
          async (transaction) => {
            await transaction.query(
              "INSERT INTO platform.architecture_transaction_probe (id) VALUES ($1)",
              [mutationRowId]
            );
            return { body: { ok: true }, status: 200 };
          }
        ),
        {
          kind: "executed",
          responseBody: { ok: true },
          responseStatus: 200
        }
      );
      assert.deepEqual(
        await idempotency.runAtomically(
          idempotencyKey,
          {
            ttlMs: 60_000
          },
          async () => assert.fail("a completed mutation must replay")
        ),
        {
          kind: "replay",
          responseBody: { ok: true },
          responseStatus: 200
        }
      );
      assert.deepEqual(
        await idempotency.runAtomically(
          {
            ...idempotencyKey,
            requestHash: hashIdempotencyPayload('{"value":2}')
          },
          {
            ttlMs: 60_000
          },
          async () => assert.fail("a conflicting mutation must not execute")
        ),
        { kind: "conflict" }
      );

      const concurrentKey = {
        ...idempotencyKey,
        key: `concurrent-${crypto.randomUUID()}`
      };
      let releaseFirstExecution: () => void = () => undefined;
      let signalFirstExecutionStarted: () => void = () => undefined;
      const firstExecutionMayFinish = new Promise<void>((resolve) => {
        releaseFirstExecution = resolve;
      });
      const firstExecutionStarted = new Promise<void>((resolve) => {
        signalFirstExecutionStarted = resolve;
      });
      const firstExecution = idempotency.runAtomically(
        concurrentKey,
        { ttlMs: 60_000 },
        async () => {
          signalFirstExecutionStarted();
          await firstExecutionMayFinish;
          return { body: { ok: true }, status: 200 };
        }
      );
      await firstExecutionStarted;
      assert.deepEqual(
        await idempotency.runAtomically(concurrentKey, { ttlMs: 60_000 }, async () =>
          assert.fail("a concurrent owner must not execute")
        ),
        { kind: "in_progress" }
      );
      releaseFirstExecution();
      assert.equal((await firstExecution).kind, "executed");

      const failingKey = {
        ...idempotencyKey,
        key: `failure-${crypto.randomUUID()}`
      };
      const rolledBackMutationRowId = crypto.randomUUID();
      await assert.rejects(
        idempotency.runAtomically(
          failingKey,
          {
            ttlMs: 60_000
          },
          async (transaction) => {
            await transaction.query(
              "INSERT INTO platform.architecture_transaction_probe (id) VALUES ($1)",
              [rolledBackMutationRowId]
            );
            throw new Error("rollback durable mutation");
          }
        ),
        /rollback durable mutation/
      );
      const atomicRows = await database.query<{ id: string }>(
        `SELECT id::text AS id
         FROM platform.architecture_transaction_probe
         WHERE id IN ($1, $2)
         ORDER BY id`,
        [mutationRowId, rolledBackMutationRowId]
      );
      assert.deepEqual(
        atomicRows.rows.map((row) => row.id),
        [mutationRowId]
      );
      const rolledBackLedger = await database.query<{ count: string }>(
        `SELECT count(*)::text AS count
         FROM platform.idempotency_records
         WHERE scope_id = $1 AND procedure_id = $2 AND idempotency_key = $3`,
        ["00000000-0000-0000-0000-000000000000", failingKey.procedureId, failingKey.key]
      );
      assert.equal(rolledBackLedger.rows[0]?.count, "0");

      const outbox = new PostgresOutboxStore(database, database);
      const eventId = crypto.randomUUID();
      const event = {
        aggregateId: "probe-1",
        aggregateType: "architecture-probe",
        eventType: "architecture.probed.v1",
        id: eventId,
        occurredAt: new Date(),
        payload: { value: 1 },
        schemaVersion: 1,
        scope: idempotencyKey.scope
      };

      await assert.rejects(
        database.run(async (transaction) => {
          await outbox.append(transaction, event);
          throw new Error("rollback outbox");
        }),
        /rollback outbox/
      );
      const rolledBack = await database.query<{ count: string }>(
        "SELECT count(*)::text AS count FROM platform.outbox_messages WHERE id = $1",
        [eventId]
      );
      assert.equal(rolledBack.rows[0]?.count, "0");

      await database.run((transaction) => outbox.append(transaction, event));
      const claimed = await outbox.claim({
        batchSize: 10,
        leaseMs: 30_000,
        workerId: "integration-worker"
      });
      assert.equal(
        claimed.some((message) => message.id === eventId),
        true
      );
      const claimedEvent = claimed.find((message) => message.id === eventId);
      assert.ok(claimedEvent);
      await assert.rejects(
        outbox.complete(eventId, claimedEvent.claimToken, "another-worker"),
        /lost ownership/
      );
      await database.query(
        "UPDATE platform.outbox_messages SET locked_until = now() - interval '1 millisecond' WHERE id = $1",
        [eventId]
      );
      const reclaimedEvent = (
        await outbox.claim({
          batchSize: 10,
          leaseMs: 30_000,
          workerId: "integration-worker"
        })
      ).find((message) => message.id === eventId);
      assert.ok(reclaimedEvent);
      assert.notEqual(reclaimedEvent.claimToken, claimedEvent.claimToken);
      await assert.rejects(
        outbox.complete(eventId, claimedEvent.claimToken, "integration-worker"),
        /lost ownership/
      );
      await outbox.complete(eventId, reclaimedEvent.claimToken, "integration-worker");

      const delivered = await database.query<{ processed: boolean }>(
        `SELECT processed_at IS NOT NULL AS processed
         FROM platform.outbox_messages WHERE id = $1`,
        [eventId]
      );
      assert.equal(delivered.rows[0]?.processed, true);

      const deadLetterEventId = crypto.randomUUID();
      await database.run((transaction) =>
        outbox.append(transaction, {
          ...event,
          id: deadLetterEventId,
          occurredAt: new Date()
        })
      );
      const deadLetterClaim = (
        await outbox.claim({
          batchSize: 10,
          leaseMs: 30_000,
          workerId: "dead-letter-worker"
        })
      ).find((message) => message.id === deadLetterEventId);
      assert.ok(deadLetterClaim);
      await outbox.fail({
        claimToken: deadLetterClaim.claimToken,
        deadLetter: true,
        error: "deliberate integration failure",
        messageId: deadLetterEventId,
        retryDelayMs: 0,
        workerId: "dead-letter-worker"
      });
      assert.equal(await outbox.requeueDeadLetter(deadLetterEventId), true);
      const replayClaim = (
        await outbox.claim({
          batchSize: 10,
          leaseMs: 30_000,
          workerId: "replay-worker"
        })
      ).find((message) => message.id === deadLetterEventId);
      assert.ok(replayClaim);
      await outbox.complete(deadLetterEventId, replayClaim.claimToken, "replay-worker");
      assert.equal(await outbox.requeueDeadLetter(deadLetterEventId), false);
    } finally {
      await database.query(
        "DELETE FROM platform.outbox_messages WHERE event_type = 'architecture.probed.v1'"
      );
      await database.query("DELETE FROM platform.idempotency_records WHERE procedure_id = $1", [
        tenantProcedureId
      ]);
      await database.query("DROP TABLE IF EXISTS platform.tenant_isolation_probe");
      await database.query("DROP TABLE IF EXISTS platform.architecture_transaction_probe");
      if (runtimeRoleCreated) {
        await database.query(`DROP OWNED BY ${runtimeRole}`);
        await database.query(`DROP ROLE ${runtimeRole}`);
      }
      await database.close();
    }
  }
);
