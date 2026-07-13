import assert from "node:assert/strict";
import test from "node:test";
import { PostgresDatabase } from "./postgres-database.js";
import { runSqlMigrations } from "./run-sql-migrations.js";
import { foundationMigrationsDirectory } from "./index.js";
import { PostgresIdempotencyStore } from "./postgres-idempotency-store.js";
import { PostgresOutboxStore } from "./postgres-outbox-store.js";
import {
  hashIdempotencyPayload
} from "@product-foundation/backend-core";
import { createWorkspaceId } from "@product-foundation/backend-core";

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
      await database.query(
        "TRUNCATE TABLE platform.architecture_transaction_probe"
      );

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

      const idempotency = new PostgresIdempotencyStore(database, database);
      const idempotencyKey = {
        key: `test-${crypto.randomUUID()}`,
        procedureId: "architecture.probe",
        requestHash: hashIdempotencyPayload('{"value":1}'),
        workspace: {
          workspaceId: createWorkspaceId(
            "cf7fe917-bc28-4ea4-9b27-6b389440686d"
          )
        }
      };

      assert.deepEqual(
        await idempotency.claim(idempotencyKey, {
          leaseMs: 30_000,
          ttlMs: 60_000
        }),
        { kind: "acquired" }
      );
      assert.deepEqual(
        await idempotency.claim(idempotencyKey, {
          leaseMs: 30_000,
          ttlMs: 60_000
        }),
        { kind: "in_progress" }
      );
      assert.deepEqual(
        await idempotency.claim(
          {
            ...idempotencyKey,
            requestHash: hashIdempotencyPayload('{"value":2}')
          },
          { leaseMs: 30_000, ttlMs: 60_000 }
        ),
        { kind: "conflict" }
      );

      await idempotency.complete(idempotencyKey, {
        body: { ok: true },
        status: 200
      });
      assert.deepEqual(
        await idempotency.claim(idempotencyKey, {
          leaseMs: 30_000,
          ttlMs: 60_000
        }),
        {
          kind: "replay",
          responseBody: { ok: true },
          responseStatus: 200
        }
      );

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
        workspace: idempotencyKey.workspace
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
      assert.equal(claimed.some((message) => message.id === eventId), true);
      await outbox.complete(eventId, "integration-worker");

      const delivered = await database.query<{ processed: boolean }>(
        `SELECT processed_at IS NOT NULL AS processed
         FROM platform.outbox_messages WHERE id = $1`,
        [eventId]
      );
      assert.equal(delivered.rows[0]?.processed, true);
    } finally {
      await database.query(
        "DROP TABLE IF EXISTS platform.architecture_transaction_probe"
      );
      await database.close();
    }
  }
);
