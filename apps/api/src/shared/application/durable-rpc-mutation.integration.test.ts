import assert from "node:assert/strict";
import test from "node:test";
import { defineRpcProcedure } from "@app/contracts";
import { globalScope } from "@product-foundation/backend-core";
import {
  foundationMigrationsDirectory,
  PostgresDatabase,
  PostgresIdempotencyStore,
  PostgresOutboxStore,
  runSqlMigrations
} from "@product-foundation/backend-postgres";
import { executeRpcProcedure } from "@product-foundation/rpc-server";
import { z } from "zod";
import {
  createIdempotentRpcHandlerInvoker,
  type IdempotentRpcMutationHandler
} from "./create-idempotent-rpc-handler-invoker.js";

const databaseUrl = process.env.TEST_DATABASE_URL;
const integrationTest = databaseUrl === undefined ? test.skip : test;

const mutationContract = defineRpcProcedure({
  id: "foundation-test.create-probe",
  inputSchema: z.object({
    id: z.string().uuid(),
    value: z.string().min(1)
  }),
  kind: "mutation",
  method: "POST",
  outputSchema: z.object({
    id: z.string().uuid(),
    value: z.string()
  }),
  path: "/rpc/v1/foundation-test-create-probe"
});

type MutationInput = z.infer<typeof mutationContract.inputSchema>;
type MutationOutput = z.infer<typeof mutationContract.outputSchema>;

function executeMutation(
  store: PostgresIdempotencyStore,
  handler: IdempotentRpcMutationHandler<MutationInput, MutationOutput>,
  input: MutationInput,
  idempotencyKey: string
) {
  return executeRpcProcedure(mutationContract, handler, {
    body: input,
    contentType: "application/json",
    handlerInvoker: createIdempotentRpcHandlerInvoker({
      idempotencyKey,
      scope: globalScope,
      store
    }),
    idempotencyKey,
    logError: () => undefined,
    signal: new AbortController().signal
  });
}

integrationTest(
  "RPC mutation commits state, outbox and validated idempotency result atomically",
  async () => {
    assert.ok(databaseUrl);
    await runSqlMigrations({
      connectionTimeoutMs: 5_000,
      directory: foundationMigrationsDirectory,
      lockName: `durable-rpc-test-${crypto.randomUUID()}`,
      url: databaseUrl
    });
    const database = new PostgresDatabase({
      connectionTimeoutMs: 5_000,
      maxConnections: 4,
      url: databaseUrl
    });
    const idempotency = new PostgresIdempotencyStore(database);
    const outbox = new PostgresOutboxStore(database, database);
    const procedureId = mutationContract.id;
    const successfulInput: MutationInput = { id: crypto.randomUUID(), value: "committed" };
    const invalidInput: MutationInput = {
      id: crypto.randomUUID(),
      value: "must-roll-back"
    };
    const successfulEventId = crypto.randomUUID();
    const invalidEventId = crypto.randomUUID();

    try {
      await database.query(`
        CREATE TABLE IF NOT EXISTS platform.durable_rpc_mutation_probe (
          id uuid PRIMARY KEY,
          value text NOT NULL
        )
      `);
      await database.query("TRUNCATE TABLE platform.durable_rpc_mutation_probe");
      await database.query("DELETE FROM platform.idempotency_records WHERE procedure_id = $1", [
        procedureId
      ]);

      const handler: IdempotentRpcMutationHandler<MutationInput, MutationOutput> = async (
        input,
        context
      ) => {
        await context.execution.transaction.query(
          "INSERT INTO platform.durable_rpc_mutation_probe (id, value) VALUES ($1, $2)",
          [input.id, input.value]
        );
        await outbox.append(context.execution.transaction, {
          aggregateId: input.id,
          aggregateType: "foundation-test-probe",
          eventType: "foundation-test.probe-created.v1",
          id: successfulEventId,
          occurredAt: new Date(),
          payload: input,
          schemaVersion: 1,
          scope: globalScope
        });
        return input;
      };

      const first = await executeMutation(idempotency, handler, successfulInput, "probe-create-1");
      const replay = await executeMutation(idempotency, handler, successfulInput, "probe-create-1");
      assert.equal(first.status, 200);
      assert.equal(replay.status, 200);
      assert.deepEqual(first.body.ok && first.body.data, successfulInput);
      assert.deepEqual(replay.body.ok && replay.body.data, successfulInput);

      const committed = await database.query<{ count: string }>(
        `SELECT count(*)::text AS count
         FROM platform.durable_rpc_mutation_probe
         WHERE id = $1`,
        [successfulInput.id]
      );
      const emitted = await database.query<{ count: string }>(
        "SELECT count(*)::text AS count FROM platform.outbox_messages WHERE id = $1",
        [successfulEventId]
      );
      assert.equal(committed.rows[0]?.count, "1");
      assert.equal(emitted.rows[0]?.count, "1");

      const invalidHandler: IdempotentRpcMutationHandler<MutationInput, MutationOutput> = async (
        input,
        context
      ) => {
        await context.execution.transaction.query(
          "INSERT INTO platform.durable_rpc_mutation_probe (id, value) VALUES ($1, $2)",
          [input.id, input.value]
        );
        await outbox.append(context.execution.transaction, {
          aggregateId: input.id,
          aggregateType: "foundation-test-probe",
          eventType: "foundation-test.probe-created.v1",
          id: invalidEventId,
          occurredAt: new Date(),
          payload: input,
          schemaVersion: 1,
          scope: globalScope
        });
        return { id: input.id, value: 42 } as unknown as MutationOutput;
      };
      const invalid = await executeMutation(
        idempotency,
        invalidHandler,
        invalidInput,
        "probe-create-invalid-1"
      );
      assert.equal(invalid.status, 500);

      const rolledBack = await database.query<{ count: string }>(
        `SELECT count(*)::text AS count
         FROM platform.durable_rpc_mutation_probe
         WHERE id = $1`,
        [invalidInput.id]
      );
      const invalidOutbox = await database.query<{ count: string }>(
        "SELECT count(*)::text AS count FROM platform.outbox_messages WHERE id = $1",
        [invalidEventId]
      );
      const invalidLedger = await database.query<{ count: string }>(
        `SELECT count(*)::text AS count
         FROM platform.idempotency_records
         WHERE procedure_id = $1 AND idempotency_key = $2`,
        [procedureId, "probe-create-invalid-1"]
      );
      assert.equal(rolledBack.rows[0]?.count, "0");
      assert.equal(invalidOutbox.rows[0]?.count, "0");
      assert.equal(invalidLedger.rows[0]?.count, "0");
    } finally {
      await database.query("DELETE FROM platform.outbox_messages WHERE id = ANY($1::uuid[])", [
        [successfulEventId, invalidEventId]
      ]);
      await database.query("DELETE FROM platform.idempotency_records WHERE procedure_id = $1", [
        procedureId
      ]);
      await database.query("DROP TABLE IF EXISTS platform.durable_rpc_mutation_probe");
      await database.close();
    }
  }
);
