import assert from "node:assert/strict";
import test from "node:test";
import type {
  SqlExecutor,
  TransactionRunner
} from "@product-foundation/backend-core";
import {
  AuthorizationDeniedError,
  denyByDefaultAuthorizationPolicy,
  requirePermission
} from "@product-foundation/backend-core";
import {
  createUserId,
  createWorkspaceId,
  type AuthorizedRequestContext
} from "@product-foundation/backend-core";
import { PostgresTenantTransactionRunner } from "@product-foundation/backend-postgres";
import type {
  ClaimedOutboxMessage,
  OutboxStore
} from "@product-foundation/backend-core";
import { OutboxWorker } from "@product-foundation/backend-core";

function context(): AuthorizedRequestContext {
  return {
    actor: {
      kind: "user",
      userId: createUserId("2dd14b91-a7dc-4a2c-9c49-f62296ae9df3")
    },
    requestId: "request-1",
    workspace: {
      workspaceId: createWorkspaceId(
        "cf7fe917-bc28-4ea4-9b27-6b389440686d"
      )
    }
  };
}

test("authorization denies access unless an explicit policy allows it", async () => {
  await assert.rejects(
    requirePermission(
      denyByDefaultAuthorizationPolicy,
      context(),
      "workspace:read"
    ),
    AuthorizationDeniedError
  );
});

test("tenant transaction installs workspace scope before repository work", async () => {
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
  const workspace = context().workspace;

  await runner.run(workspace, async (transaction) => {
    assert.equal(transaction.workspace, workspace);
    await transaction.query("SELECT current_setting('app.workspace_id')");
  });

  assert.deepEqual(queries, [
    {
      text: "SELECT set_config('app.workspace_id', $1, true)",
      values: [workspace.workspaceId]
    },
    {
      text: "SELECT current_setting('app.workspace_id')",
      values: []
    }
  ]);
});

test("tenant identifiers reject non-UUID input", () => {
  assert.throws(() => createWorkspaceId("workspace-1"), /must be a UUID/);
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
    workspace: context().workspace
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
