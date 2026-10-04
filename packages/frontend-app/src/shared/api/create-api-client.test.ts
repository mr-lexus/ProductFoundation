import assert from "node:assert/strict";
import test from "node:test";
import { createApiClient } from "./create-api-client";

test("bootstrap API clients isolate transports and preserve cancellation and platform input", async () => {
  const controller = new AbortController();
  const calls: string[] = [];
  const first = createApiClient({
    apiBaseUrl: "https://first.example",
    fetch: async (url, init) => {
      calls.push(String(url));
      assert.equal(init?.signal, controller.signal);
      assert.deepEqual(JSON.parse(String(init?.body)), { platform: "mobile" });
      return Response.json({
        ok: true,
        data: { message: "ready", platform: "mobile", status: "ready" },
        meta: { requestId: "request-1", servedAt: "2026-07-15T00:00:00.000Z" }
      });
    }
  });
  const second = createApiClient({
    apiBaseUrl: "https://second.example",
    fetch: async (url) => {
      calls.push(String(url));
      throw new Error("offline");
    }
  });
  assert.equal(
    (await first.pingSystem({ platform: "mobile" }, { signal: controller.signal })).data.platform,
    "mobile"
  );
  await assert.rejects(second.pingSystem({ platform: "desktop" }), { code: "NETWORK_ERROR" });
  assert.deepEqual(calls, [
    "https://first.example/rpc/v1/system-ping",
    "https://second.example/rpc/v1/system-ping"
  ]);
});
