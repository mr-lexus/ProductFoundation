import assert from "node:assert/strict";
import test from "node:test";
import { defineRpcProcedure } from "@product-foundation/rpc";
import { z } from "zod";
import { callRpcProcedure } from "./call-rpc-procedure.js";
import { RpcClientError } from "./rpc-client-error.js";

const query = defineRpcProcedure({
  id: "example.read",
  inputSchema: z.object({ id: z.string() }),
  kind: "query",
  method: "POST",
  outputSchema: z.object({ value: z.string() }),
  path: "/rpc/v1/example-read"
});

test("RPC client validates the response and forwards request metadata", async () => {
  let request: RequestInit | undefined;
  const result = await callRpcProcedure(
    {
      apiBaseUrl: "https://api.example.com/",
      fetch: async (_input, init) => {
        request = init;
        return new Response(
          JSON.stringify({
            data: { value: "saved" },
            meta: {
              requestId: "request-1",
              servedAt: "2026-07-15T00:00:00.000Z"
            },
            ok: true
          }),
          {
            headers: { "content-type": "application/json" },
            status: 200
          }
        );
      }
    },
    query,
    { id: "item-1" },
    { idempotencyKey: "read-1" }
  );

  assert.equal(result.data.value, "saved");
  assert.ok(request);
  assert.equal((request.headers as Record<string, string>)["x-idempotency-key"], "read-1");
  assert.equal(request.credentials, "include");
});

test("RPC client rejects invalid input before fetch", async () => {
  let fetched = false;
  await assert.rejects(
    callRpcProcedure(
      {
        apiBaseUrl: "https://api.example.com",
        fetch: async () => {
          fetched = true;
          return new Response();
        }
      },
      query,
      { id: 42 } as unknown as { id: string }
    ),
    (error: unknown) => error instanceof RpcClientError && error.code === "INVALID_INPUT"
  );
  assert.equal(fetched, false);
});

test("RPC client maps a typed error envelope", async () => {
  await assert.rejects(
    callRpcProcedure(
      {
        apiBaseUrl: "https://api.example.com",
        fetch: async () =>
          new Response(
            JSON.stringify({
              error: {
                code: "RATE_LIMITED",
                message: "Slow down.",
                retryable: true
              },
              meta: { requestId: "request-rate-limited" },
              ok: false
            }),
            { status: 429 }
          )
      },
      query,
      { id: "item-1" }
    ),
    (error: unknown) =>
      error instanceof RpcClientError &&
      error.code === "RATE_LIMITED" &&
      error.requestId === "request-rate-limited" &&
      error.retryable
  );
});

test("RPC client rejects an invalid success response", async () => {
  await assert.rejects(
    callRpcProcedure(
      {
        apiBaseUrl: "https://api.example.com",
        fetch: async () =>
          new Response(
            JSON.stringify({
              data: { value: 42 },
              meta: {
                requestId: "request-invalid",
                servedAt: "2026-07-15T00:00:00.000Z"
              },
              ok: true
            }),
            { status: 200 }
          )
      },
      query,
      { id: "item-1" }
    ),
    (error: unknown) => error instanceof RpcClientError && error.code === "INVALID_RESPONSE"
  );
});

test("RPC client distinguishes cancellation from a network error", async () => {
  const abort = new AbortController();
  abort.abort();
  await assert.rejects(
    callRpcProcedure(
      {
        apiBaseUrl: "https://api.example.com",
        fetch: async () => {
          throw new Error("aborted");
        }
      },
      query,
      { id: "item-1" },
      { signal: abort.signal }
    ),
    (error: unknown) => error instanceof RpcClientError && error.code === "REQUEST_ABORTED"
  );
});

test("RPC client rejects output transforms that are unstable on the wire", async () => {
  const unstableQuery = defineRpcProcedure({
    id: "example.unstable",
    inputSchema: z.object({}),
    kind: "query",
    method: "POST",
    outputSchema: z.object({ value: z.number().transform((value) => value + 1) }),
    path: "/rpc/v1/example-unstable"
  });
  await assert.rejects(
    callRpcProcedure(
      {
        apiBaseUrl: "https://api.example.com",
        fetch: async () =>
          new Response(
            JSON.stringify({
              data: { value: 1 },
              meta: {
                requestId: "request-unstable",
                servedAt: "2026-07-15T00:00:00.000Z"
              },
              ok: true
            }),
            { status: 200 }
          )
      },
      unstableQuery,
      {}
    ),
    (error: unknown) => error instanceof RpcClientError && error.code === "INVALID_RESPONSE"
  );
});
