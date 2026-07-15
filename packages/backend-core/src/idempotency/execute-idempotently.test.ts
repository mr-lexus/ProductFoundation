import assert from "node:assert/strict";
import test from "node:test";
import type { IdempotencyKey, IdempotencyOwnership, IdempotencyStore } from "../index.js";
import {
  executeIdempotently,
  globalScope,
  hashIdempotencyValue,
  IdempotencyConflictError
} from "../index.js";

test("idempotency hashes JSON objects independently of key order", () => {
  assert.equal(
    hashIdempotencyValue({ a: 1, nested: { x: true, y: "value" } }),
    hashIdempotencyValue({ nested: { y: "value", x: true }, a: 1 })
  );
});

test("idempotent execution completes with the ownership that acquired the lease", async () => {
  let claimedOwner: string | undefined;
  let completedOwner: string | undefined;
  const store: IdempotencyStore = {
    async claim(_key, ownership) {
      claimedOwner = ownership.ownerId;
      return { kind: "acquired" };
    },
    async complete(_key, ownership) {
      completedOwner = ownership.ownerId;
    },
    async release() {
      assert.fail("successful execution must not release its lease");
    }
  };

  const result = await executeIdempotently({
    execute: async () => ({ body: { created: true }, status: 200 }),
    idempotencyKey: "create-1",
    input: { name: "Example" },
    leaseMs: 30_000,
    procedureId: "example.create",
    scope: globalScope,
    store,
    ttlMs: 60_000
  });

  assert.deepEqual(result, {
    body: { created: true },
    replayed: false,
    status: 200
  });
  assert.ok(claimedOwner);
  assert.equal(completedOwner, claimedOwner);
});

test("idempotent execution rejects a key reused for another payload", async () => {
  const store: IdempotencyStore = {
    async claim() {
      return { kind: "conflict" };
    },
    async complete(_key: IdempotencyKey, _ownership: IdempotencyOwnership) {},
    async release(_key: IdempotencyKey, _ownership: IdempotencyOwnership) {}
  };

  await assert.rejects(
    executeIdempotently({
      execute: async () => ({ body: null, status: 200 }),
      idempotencyKey: "conflict-1",
      input: { value: 1 },
      leaseMs: 30_000,
      procedureId: "example.update",
      scope: globalScope,
      store,
      ttlMs: 60_000
    }),
    IdempotencyConflictError
  );
});
