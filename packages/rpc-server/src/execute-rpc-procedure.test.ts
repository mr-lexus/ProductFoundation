import assert from "node:assert/strict";
import test from "node:test";
import { defineRpcProcedure } from "@product-foundation/rpc";
import { z } from "zod";
import { executeRpcProcedure } from "./execute-rpc-procedure.js";
import type { RpcHandlerInvoker } from "./rpc-handler.js";

const mutation = defineRpcProcedure({
  id: "example.create",
  inputSchema: z.object({ value: z.string() }),
  kind: "mutation",
  method: "POST",
  outputSchema: z.object({ saved: z.boolean() }),
  path: "/rpc/v1/example-create"
});

function options(overrides: Record<string, unknown> = {}) {
  return {
    body: { value: "ok" },
    contentType: "application/json",
    createRequestId: () => "generated-request-id",
    idempotencyKey: "create-1",
    logError: () => undefined,
    signal: new AbortController().signal,
    ...overrides
  };
}

test("RPC invokes a validated mutation through the supplied handler invoker", async () => {
  let invoked = false;
  const invoker: RpcHandlerInvoker = {
    async invoke({ context, handler, input }) {
      invoked = true;
      assert.equal(context.idempotencyKey, "create-1");
      return handler(input, context);
    }
  };
  const result = await executeRpcProcedure(
    mutation,
    async () => ({ saved: true }),
    options({ handlerInvoker: invoker })
  );

  assert.equal(result.status, 200);
  assert.equal(result.body.ok, true);
  assert.equal(invoked, true);
});

test("RPC requires an idempotency key when a mutation uses an invoker", async () => {
  const invoker: RpcHandlerInvoker = {
    async invoke() {
      assert.fail("a mutation without a key must not be invoked");
    }
  };
  const result = await executeRpcProcedure(
    mutation,
    async () => ({ saved: true }),
    options({ handlerInvoker: invoker, idempotencyKey: undefined })
  );

  assert.equal(result.status, 400);
  assert.equal(result.body.ok, false);
});

test("RPC rejects a mutation without a durable handler invoker", async () => {
  let logged = false;
  const result = await executeRpcProcedure(
    mutation,
    async () => {
      assert.fail("a mutation without a durable invoker must not run");
    },
    options({
      logError: () => {
        logged = true;
      }
    })
  );

  assert.equal(result.status, 500);
  assert.equal(result.body.ok, false);
  assert.equal(logged, true);
});
