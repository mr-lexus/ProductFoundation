import assert from "node:assert/strict";
import test from "node:test";
import type {
  ClaimedOutboxMessage,
  OutboxStore,
  SqlExecutor,
  TransactionRunner
} from "@product-foundation/backend-core";
import {
  AuthorizationDeniedError,
  type AuthorizedRequestContext,
  createTenantId,
  createUserId,
  denyByDefaultAuthorizationPolicy,
  OutboxWorker,
  requirePermission
} from "@product-foundation/backend-core";
import { PostgresTenantTransactionRunner } from "@product-foundation/backend-postgres";

function context(): AuthorizedRequestContext {
  return {
    actor: {
      kind: "user",
      userId: createUserId("2dd14b91-a7dc-4a2c-9c49-f62296ae9df3")
    },
    requestId: "request-1",
    scope: {
      kind: "tenant",
      tenantId: createTenantId("cf7fe917-bc28-4ea4-9b27-6b389440686d")
    }
  };
}

test("authorization denies access unless an explicit policy allows it", async () => {
  await assert.rejects(
    requirePermission(denyByDefaultAuthorizationPolicy, context(), "tenant:read"),
    AuthorizationDeniedError
  );
});

test("tenant transaction installs tenant scope before repository work", async () => {
  const queries: Array<{ text: string; values: readonly unknown[] }> = [];
  const executor: SqlExecutor = {
    async query(text, values = []) {
      queries.push({ text, values });
      return { rowCount: 0, rows: [] };
    }
  };
  const transactions: TransactionRunner = {
    async run(work) {
      return work(executor);
    }
  };
  const runner = new PostgresTenantTransactionRunner(transactions);
  const scope = context().scope;
  assert.equal(scope.kind, "tenant");

  await runner.run(scope, async (transaction) => {
    assert.equal(transaction.scope, scope);
    await transaction.query("SELECT current_setting('app.tenant_id')");
  });

  assert.deepEqual(queries, [
    {
      text: "SELECT set_config('app.tenant_id', $1, true)",
      values: [scope.tenantId]
    },
    {
      text: "SELECT current_setting('app.tenant_id')",
      values: []
    }
  ]);
});

test("tenant identifiers reject non-UUID input", () => {
  assert.throws(() => createTenantId("tenant-1"), /must be a UUID/);
  assert.throws(() => createUserId("user-1"), /must be a UUID/);
});

function claimedMessage(attemptCount = 1): ClaimedOutboxMessage {
  return {
    aggregateId: "aggregate-1",
    aggregateType: "architecture-probe",
    attemptCount,
    eventType: "architecture.probed.v1",
    id: "3e052fc8-f7d3-4194-a280-1fe9752e3777",
    occurredAt: new Date("2026-07-12T00:00:00.000Z"),
    payload: { ignoredByLogs: "sensitive" },
    schemaVersion: 1,
    scope: context().scope
  };
}

test("outbox worker completes successfully handled messages", async () => {
  const completed: string[] = [];
  const store: OutboxStore = {
    async claim() {
      return [claimedMessage()];
    },
    async complete(messageId) {
      completed.push(messageId);
    },
    async fail() {
      assert.fail("successful delivery must not be failed");
    }
  };
  const handled: string[] = [];
  const worker = new OutboxWorker(
    store,
    new Map([
      [
        "architecture.probed.v1",
        {
          async handle(message: ClaimedOutboxMessage) {
            handled.push(message.id);
          }
        }
      ]
    ]),
    { batchSize: 10, leaseMs: 30_000, maxAttempts: 3, workerId: "worker-1" },
    () => undefined
  );

  assert.equal(await worker.runOnce(), 1);
  assert.deepEqual(handled, [claimedMessage().id]);
  assert.deepEqual(completed, [claimedMessage().id]);
});

test("outbox worker dead-letters exhausted messages without logging payload", async () => {
  const failures: Array<Record<string, unknown>> = [];
  const logs: Array<Readonly<Record<string, unknown>>> = [];
  const store: OutboxStore = {
    async claim() {
      return [claimedMessage(3)];
    },
    async complete() {
      assert.fail("unhandled delivery must not complete");
    },
    async fail(options) {
      failures.push({ ...options });
    }
  };
  const worker = new OutboxWorker(
    store,
    new Map(),
    { batchSize: 10, leaseMs: 30_000, maxAttempts: 3, workerId: "worker-1" },
    (entry) => logs.push(entry)
  );

  await worker.runOnce();

  assert.equal(failures[0]?.deadLetter, true);
  assert.equal(logs[0]?.deadLetter, true);
  assert.equal("payload" in (logs[0] ?? {}), false);
});
