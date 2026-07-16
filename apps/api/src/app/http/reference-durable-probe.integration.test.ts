import assert from "node:assert/strict";
import test from "node:test";
import { OutboxWorker } from "@product-foundation/backend-core";
import {
  foundationMigrationsDirectory,
  PostgresDatabase,
  PostgresOutboxStore,
  runSqlMigrations
} from "@product-foundation/backend-postgres";
import { REFERENCE_DURABLE_PROBE_CREATED_EVENT } from "../../modules/reference/application/create-reference-durable-probe.js";
import { createReferenceDurableProbeOutboxHandler } from "../../modules/reference/infrastructure/create-reference-durable-probe-outbox-handler.js";
import { createNestApplication } from "../create-nest-application.js";

const databaseUrl = process.env.TEST_DATABASE_URL;
const integrationTest = databaseUrl === undefined ? test.skip : test;
const productMigrationsDirectory = new URL("../../../migrations/", import.meta.url);

async function rpc(baseUrl: string, path: string, body: unknown, idempotencyKey?: string) {
  const response = await fetch(`${baseUrl}${path}`, {
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      ...(idempotencyKey === undefined ? {} : { "x-idempotency-key": idempotencyKey })
    },
    method: "POST"
  });
  return { payload: (await response.json()) as unknown, status: response.status };
}

integrationTest(
  "compiled Nest boundary proves mutation, replay, outbox and idempotent worker delivery",
  async () => {
    assert.ok(databaseUrl);
    await runSqlMigrations({
      connectionTimeoutMs: 5_000,
      directory: foundationMigrationsDirectory,
      url: databaseUrl
    });
    await runSqlMigrations({
      connectionTimeoutMs: 5_000,
      directory: productMigrationsDirectory,
      namespace: "reference-integration",
      url: databaseUrl
    });

    const database = new PostgresDatabase({
      connectionTimeoutMs: 5_000,
      maxConnections: 4,
      url: databaseUrl
    });
    const id = crypto.randomUUID();
    const idempotencyKey = `reference-${id}`;
    const procedureId = "reference-durable-probe.create";
    const application = await createNestApplication(
      {
        corsOrigins: ["http://127.0.0.1:1420"],
        dataScopeMode: "global",
        database: {
          connectionTimeoutMs: 5_000,
          maxConnections: 4,
          url: databaseUrl
        },
        environment: "test",
        logLevel: "silent",
        maxRpcBodyBytes: 1_048_576,
        rateLimit: { max: 100, windowMs: 60_000 },
        trustProxy: false
      },
      { logger: false }
    );

    try {
      await database.query("DELETE FROM platform.outbox_messages WHERE event_type = $1", [
        REFERENCE_DURABLE_PROBE_CREATED_EVENT
      ]);
      await database.query("DELETE FROM platform.idempotency_records WHERE procedure_id = $1", [
        procedureId
      ]);
      await database.query("DELETE FROM app.reference_durable_probes WHERE id = $1", [id]);

      await application.listen(0, "127.0.0.1");
      const baseUrl = await application.getUrl();
      const request = { id, value: "reference-http-proof" };
      const first = await rpc(
        baseUrl,
        "/rpc/v1/reference-durable-probe-create",
        request,
        idempotencyKey
      );
      const replay = await rpc(
        baseUrl,
        "/rpc/v1/reference-durable-probe-create",
        request,
        idempotencyKey
      );
      assert.equal(first.status, 200);
      assert.equal(replay.status, 200);
      assert.deepEqual(
        (replay.payload as { data?: unknown }).data,
        (first.payload as { data?: unknown }).data
      );

      const store = new PostgresOutboxStore(database, database);
      const worker = new OutboxWorker(
        store,
        new Map([
          [
            REFERENCE_DURABLE_PROBE_CREATED_EVENT,
            createReferenceDurableProbeOutboxHandler(database)
          ]
        ]),
        { batchSize: 10, leaseMs: 30_000, maxAttempts: 3, workerId: `test-${id}` },
        () => undefined
      );
      assert.equal(await worker.runOnce(), 1);
      assert.equal(await worker.runOnce(), 0);

      const status = await rpc(baseUrl, "/rpc/v1/reference-durable-probe-status", { id });
      assert.equal(status.status, 200);
      assert.equal(
        typeof (status.payload as { data?: { deliveredAt?: unknown } }).data?.deliveredAt,
        "string"
      );
    } finally {
      await application.close();
      await database.query(
        "DELETE FROM platform.outbox_messages WHERE event_type = $1 AND aggregate_id = $2",
        [REFERENCE_DURABLE_PROBE_CREATED_EVENT, id]
      );
      await database.query(
        "DELETE FROM platform.idempotency_records WHERE procedure_id = $1 AND idempotency_key = $2",
        [procedureId, idempotencyKey]
      );
      await database.query("DELETE FROM app.reference_durable_probes WHERE id = $1", [id]);
      await database.close();
    }
  }
);
