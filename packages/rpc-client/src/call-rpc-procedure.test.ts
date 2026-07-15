import assert from "node:assert/strict";
import test from "node:test";
import { defineRpcProcedure } from "@product-foundation/rpc";
import { z } from "zod";
import { callRpcProcedure } from "./call-rpc-procedure.js";

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
