import assert from "node:assert/strict";
import test from "node:test";
import { createSystemStatusModel } from "./system-status";

test("system status maps validated transport data into a stable UI model", () => {
  assert.deepEqual(
    createSystemStatusModel(
      {
        data: {
          message: "Foundation is ready.",
          platform: "web",
          status: "ready"
        },
        meta: {
          requestId: "request-1",
          servedAt: "2026-07-15T00:00:00.000Z"
        }
      },
      "https://api.example.com"
    ),
    {
      apiBaseUrl: "https://api.example.com",
      message: "Foundation is ready.",
      platform: "web",
      requestId: "request-1",
      servedAt: "2026-07-15T00:00:00.000Z",
      title: "Foundation status",
      transportMeta: "web via versioned RPC"
    }
  );
});
