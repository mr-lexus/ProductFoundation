import assert from "node:assert/strict";
import test from "node:test";
import {
  globalScope,
  type IdempotencyStore,
  type SqlExecutor
} from "@product-foundation/backend-core";
import type { RpcRequestContext } from "@product-foundation/rpc-server";
import { createIdempotentRpcHandlerInvoker } from "./create-idempotent-rpc-handler-invoker.js";

test("API idempotency bridge persists a validated RPC handler result", async () => {
  let completed = false;
  const transaction: SqlExecutor = {
    async query() {
      return { rowCount: 0, rows: [] };
    }
  };
  const store: IdempotencyStore = {
    async runAtomically(_key, _ownership, execute) {
      const response = await execute(transaction);
      completed = true;
      return {
        kind: "executed",
        responseBody: response.body,
        responseStatus: response.status
      };
    }
  };
  const invoker = createIdempotentRpcHandlerInvoker({
    idempotencyKey: "mutation-1",
    scope: globalScope,
    store
  });
  const context: RpcRequestContext = {
    actor: null,
    execution: undefined,
    idempotencyKey: "mutation-1",
    receivedAt: new Date("2026-07-15T00:00:00.000Z"),
    requestId: "request-1",
    signal: new AbortController().signal
  };
  const output = await invoker.invoke({
    context,
    handler: async (input: { value: string }, mutationContext) => {
      assert.equal(mutationContext.execution.transaction, transaction);
      return { saved: input.value };
    },
    input: { value: "yes" },
    procedureId: "example.save",
    validateOutput: (output) => output as { saved: string }
  });

  assert.deepEqual(output, { saved: "yes" });
  assert.equal(completed, true);
});
