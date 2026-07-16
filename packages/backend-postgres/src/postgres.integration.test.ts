import assert from "node:assert/strict";
import test from "node:test";
import { globalScope, hashIdempotencyPayload } from "@product-foundation/backend-core";
import { foundationMigrationsDirectory } from "./index.js";
import { PostgresDatabase } from "./postgres-database.js";
import { PostgresIdempotencyStore } from "./postgres-idempotency-store.js";
import { PostgresOutboxStore } from "./postgres-outbox-store.js";
import { runSqlMigrations } from "./run-sql-migrations.js";
import { assertTenantRelationsSecure } from "./tenant-isolation.js";

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
      assert.equal(migrationJournal.rows[0]?.count, "2");

      const idempotency = new PostgresIdempotencyStore(database);
      const firstOwner = { ownerId: crypto.randomUUID() };
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
            ...firstOwner,
            leaseMs: 30_000,
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
            leaseMs: 30_000,
            ownerId: crypto.randomUUID(),
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
            leaseMs: 30_000,
            ownerId: crypto.randomUUID(),
            ttlMs: 60_000
          },
          async () => assert.fail("a conflicting mutation must not execute")
        ),
        { kind: "conflict" }
      );

      const failingKey = {
        ...idempotencyKey,
        key: `failure-${crypto.randomUUID()}`
      };
      const rolledBackMutationRowId = crypto.randomUUID();
      await assert.rejects(
        idempotency.runAtomically(
          failingKey,
          {
            leaseMs: 30_000,
            ownerId: crypto.randomUUID(),
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
      await assert.rejects(outbox.complete(eventId, "another-worker"), /lost ownership/);
      await outbox.complete(eventId, "integration-worker");

      const delivered = await database.query<{ processed: boolean }>(
        `SELECT processed_at IS NOT NULL AS processed
         FROM platform.outbox_messages WHERE id = $1`,
        [eventId]
      );
      assert.equal(delivered.rows[0]?.processed, true);
    } finally {
      await database.query("DROP TABLE IF EXISTS platform.tenant_isolation_probe");
      await database.query("DROP TABLE IF EXISTS platform.architecture_transaction_probe");
      await database.close();
    }
  }
);
