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
import {
  assertTenantRuntimeRoleSafe,
  PostgresTenantTransactionRunner
} from "@product-foundation/backend-postgres";

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
      text: "SET LOCAL row_security = on",
      values: []
    },
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

test("tenant runtime role rejects PostgreSQL RLS bypass capabilities", async () => {
  const sql: SqlExecutor = {
    async query<TRow extends object>() {
      return {
        rowCount: 1,
        rows: [
          {
            bypasses_rls: true,
            is_superuser: false,
            role_name: "unsafe_runtime"
          }
        ] as unknown as TRow[]
      };
    }
  };

  await assert.rejects(assertTenantRuntimeRoleSafe(sql), /NOSUPERUSER and NOBYPASSRLS/);
});

function claimedMessage(
  attemptCount = 1,
  id = "3e052fc8-f7d3-4194-a280-1fe9752e3777"
): ClaimedOutboxMessage {
  return {
    aggregateId: "aggregate-1",
    aggregateType: "architecture-probe",
    attemptCount,
    eventType: "architecture.probed.v1",
    id,
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

test("outbox worker schedules a bounded retry before dead-letter exhaustion", async () => {
  let failure: Parameters<OutboxStore["fail"]>[0] | undefined;
  const store: OutboxStore = {
    async claim() {
      return [claimedMessage(1)];
    },
    async complete() {
      assert.fail("an unhandled message must not complete");
    },
    async fail(options) {
      failure = options;
    }
  };
  const worker = new OutboxWorker(
    store,
    new Map(),
    { batchSize: 1, leaseMs: 30_000, maxAttempts: 3, workerId: "worker-1" },
    () => undefined
  );

  await worker.runOnce();

  assert.equal(failure?.deadLetter, false);
  assert.equal(failure?.retryDelayMs, 250);
});

test("outbox worker starts every claimed lease without queueing behind another handler", async () => {
  const first = claimedMessage(1, "3e052fc8-f7d3-4194-a280-1fe9752e3777");
  const second = claimedMessage(1, "c9987653-a4ec-4f17-bdd8-1df71559cbf8");
  const started: string[] = [];
  let releaseFirst: (() => void) | undefined;
  const firstMayFinish = new Promise<void>((resolve) => {
    releaseFirst = resolve;
  });
  const store: OutboxStore = {
    async claim() {
      return [first, second];
    },
    async complete() {},
    async fail() {
      assert.fail("successful concurrent deliveries must not fail");
    }
  };
  const worker = new OutboxWorker(
    store,
    new Map([
      [
        first.eventType,
        {
          async handle(message: ClaimedOutboxMessage) {
            started.push(message.id);
            if (message.id === first.id) {
              await firstMayFinish;
            }
          }
        }
      ]
    ]),
    { batchSize: 2, leaseMs: 30_000, maxAttempts: 3, workerId: "worker-1" },
    () => undefined
  );

  const run = worker.runOnce();
  await Promise.resolve();
  assert.deepEqual(started, [first.id, second.id]);
  releaseFirst?.();
  assert.equal(await run, 2);
});

test("outbox worker does not abandon leases when shutdown starts during claim", async () => {
  const controller = new AbortController();
  const failed: string[] = [];
  const message = claimedMessage();
  const store: OutboxStore = {
    async claim() {
      controller.abort();
      return [message];
    },
    async complete() {
      assert.fail("an aborted delivery must not complete");
    },
    async fail(options) {
      failed.push(options.messageId);
    }
  };
  const worker = new OutboxWorker(
    store,
    new Map([
      [
        message.eventType,
        {
          async handle(_message, context) {
            context.signal?.throwIfAborted();
          }
        }
      ]
    ]),
    { batchSize: 1, leaseMs: 30_000, maxAttempts: 3, workerId: "worker-1" },
    () => undefined
  );

  assert.equal(await worker.runOnce(controller.signal), 1);
  assert.deepEqual(failed, [message.id]);
});

test("outbox worker does not claim after shutdown", async () => {
  const controller = new AbortController();
  controller.abort();
  const store: OutboxStore = {
    async claim() {
      assert.fail("an aborted worker must not claim messages");
    },
    async complete() {},
    async fail() {}
  };
  const worker = new OutboxWorker(
    store,
    new Map(),
    { batchSize: 1, leaseMs: 30_000, maxAttempts: 3, workerId: "worker-1" },
    () => undefined
  );

  assert.equal(await worker.runOnce(controller.signal), 0);
});
