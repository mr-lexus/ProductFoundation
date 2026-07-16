import assert from "node:assert/strict";
import test from "node:test";
import { defineRpcProcedure } from "@product-foundation/rpc";
import { z } from "zod";
import { executeRpcProcedure } from "./execute-rpc-procedure.js";
import { RpcApplicationError } from "./rpc-application-error.js";
import type { RpcHandlerInvoker } from "./rpc-handler.js";
import { isJsonContentType } from "./rpc-protocol.js";

const mutation = defineRpcProcedure({
  id: "example.create",
  inputSchema: z.object({ value: z.string() }),
  kind: "mutation",
  method: "POST",
  outputSchema: z.object({ saved: z.boolean() }),
  path: "/rpc/v1/example-create"
});

test("RPC accepts only a syntactically valid application/json media type", () => {
  assert.equal(isJsonContentType("application/json"), true);
  assert.equal(isJsonContentType("Application/JSON; charset=utf-8"), true);
  assert.equal(isJsonContentType('application/json; charset="utf-8"'), true);
  assert.equal(isJsonContentType("application/jsonp"), false);
  assert.equal(isJsonContentType("application/json-evil"), false);
  assert.equal(isJsonContentType("application/json; broken"), false);
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
    async invoke({ context, handler, input, validateOutput }) {
      invoked = true;
      assert.equal(context.idempotencyKey, "create-1");
      return validateOutput(await handler(input, context));
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

test("RPC validates mutation output before the invoker may persist it", async () => {
  let validationFailedInsideInvoker = false;
  const invoker: RpcHandlerInvoker = {
    async invoke({ context, handler, input, validateOutput }) {
      const output = await handler(input, context);
      try {
        return validateOutput(output);
      } catch (error) {
        validationFailedInsideInvoker = true;
        throw error;
      }
    }
  };
  const result = await executeRpcProcedure(
    mutation,
    async () => ({ saved: "not-a-boolean" }) as unknown as { saved: boolean },
    options({ handlerInvoker: invoker })
  );

  assert.equal(result.status, 500);
  assert.equal(validationFailedInsideInvoker, true);
});

test("RPC rejects schema transformations that produce non-JSON values", async () => {
  const transformed = defineRpcProcedure({
    id: "example.date",
    inputSchema: z.object({ value: z.string() }),
    kind: "query",
    method: "POST",
    outputSchema: z.object({ when: z.date() }),
    path: "/rpc/v1/example-date"
  });
  const result = await executeRpcProcedure(
    transformed,
    async () => ({ when: new Date("2026-07-15T00:00:00.000Z") }),
    options({ handlerInvoker: undefined })
  );

  assert.equal(result.status, 500);
  assert.equal(result.body.ok, false);
});

test("RPC rejects schema transformations that change on every wire parse", async () => {
  const transformed = defineRpcProcedure({
    id: "example.counter",
    inputSchema: z.object({ value: z.number() }),
    kind: "query",
    method: "POST",
    outputSchema: z.object({ value: z.number().transform((value) => value + 1) }),
    path: "/rpc/v1/example-counter"
  });
  const result = await executeRpcProcedure(
    transformed,
    async () => ({ value: 1 }),
    options({ body: { value: 1 }, handlerInvoker: undefined })
  );

  assert.equal(result.status, 500);
  assert.equal(result.body.ok, false);
});

test("RPC derives HTTP status from the application error code", async () => {
  const invoker: RpcHandlerInvoker = {
    async invoke({ context, handler, input }) {
      return handler(input, context);
    }
  };
  const result = await executeRpcProcedure(
    mutation,
    async () => {
      throw new RpcApplicationError({
        code: "NOT_FOUND",
        details: { resource: "example" },
        message: "The example does not exist."
      });
    },
    options({ handlerInvoker: invoker })
  );

  assert.equal(result.status, 404);
  assert.equal(result.body.ok, false);
  if (!result.body.ok) {
    assert.equal(result.body.error.code, "NOT_FOUND");
  }
});
