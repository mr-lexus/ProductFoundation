import assert from "node:assert/strict";
import test from "node:test";
import {
  createTenantId,
  deserializeOperationScope,
  globalScope,
  serializeOperationScope
} from "./request-context.js";

test("global scope survives durable serialization", () => {
  assert.deepEqual(deserializeOperationScope(serializeOperationScope(globalScope)), globalScope);
});

test("tenant IDs cannot collide with the reserved global scope UUID", () => {
  assert.throws(() => createTenantId("00000000-0000-0000-0000-000000000000"), /must be a UUID/);
});
