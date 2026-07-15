import assert from "node:assert/strict";
import test from "node:test";
import { globalScope, type IdempotencyStore } from "@product-foundation/backend-core";
import type { RpcRequestContext } from "@product-foundation/rpc-server";
import { createIdempotentRpcHandlerInvoker } from "./create-idempotent-rpc-handler-invoker.js";

test("API idempotency bridge persists a validated RPC handler result", async () => {
  let completed = false;
  const store: IdempotencyStore = {
    async claim() {
      return { kind: "acquired" };
    },
    async complete() {
      completed = true;
    },
    async release() {
      assert.fail("successful RPC mutation must not release its lease");
    }
  };
  const invoker = createIdempotentRpcHandlerInvoker({
    idempotencyKey: "mutation-1",
    scope: globalScope,
    store
  });
  const context: RpcRequestContext = {
    actor: null,
    idempotencyKey: "mutation-1",
    receivedAt: new Date("2026-07-15T00:00:00.000Z"),
    requestId: "request-1",
    signal: new AbortController().signal
  };
  const output = await invoker.invoke({
    context,
    handler: async (input: { value: string }) => ({ saved: input.value }),
    input: { value: "yes" },
    procedureId: "example.save"
  });

  assert.deepEqual(output, { saved: "yes" });
  assert.equal(completed, true);
});
