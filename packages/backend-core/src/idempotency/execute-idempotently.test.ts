import assert from "node:assert/strict";
import test from "node:test";
import type { IdempotencyStore, SqlExecutor } from "../index.js";
import {
  executeIdempotently,
  globalScope,
  hashIdempotencyValue,
  IdempotencyConflictError,
  IdempotencyInProgressError
} from "../index.js";

const transaction: SqlExecutor = {
  async query() {
    return { rowCount: 0, rows: [] };
  }
};

test("idempotency hashes JSON objects independently of key order", () => {
  assert.equal(
    hashIdempotencyValue({ a: 1, nested: { x: true, y: "value" } }),
    hashIdempotencyValue({ nested: { y: "value", x: true }, a: 1 })
  );
});

test("idempotency rejects non-JSON payload objects", () => {
  assert.throws(() => hashIdempotencyValue({ when: new Date() }), /non-plain object/);
});

test("idempotent execution uses the transaction supplied by the store", async () => {
  const store: IdempotencyStore = {
    async runAtomically(_key, _options, execute) {
      const response = await execute(transaction);
      return {
        kind: "executed",
        responseBody: response.body,
        responseStatus: response.status
      };
    }
  };

  const result = await executeIdempotently({
    execute: async (suppliedTransaction) => {
      assert.equal(suppliedTransaction, transaction);
      return { body: { created: true }, status: 200 };
    },
    idempotencyKey: "create-1",
    input: { name: "Example" },
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
});

test("idempotent execution rejects a key reused for another payload", async () => {
  const store: IdempotencyStore = {
    async runAtomically() {
      return { kind: "conflict" };
    }
  };

  await assert.rejects(
    executeIdempotently({
      execute: async () => ({ body: null, status: 200 }),
      idempotencyKey: "conflict-1",
      input: { value: 1 },
      procedureId: "example.update",
      scope: globalScope,
      store,
      ttlMs: 60_000
    }),
    IdempotencyConflictError
  );
});

test("idempotent execution returns a stored replay without invoking work", async () => {
  const store: IdempotencyStore = {
    async runAtomically<TBody>() {
      return {
        kind: "replay",
        responseBody: { created: true } as unknown as TBody,
        responseStatus: 200
      };
    }
  };

  const result = await executeIdempotently({
    execute: async () => assert.fail("replayed work must not execute"),
    idempotencyKey: "replay-1",
    input: { value: 1 },
    procedureId: "example.create",
    scope: globalScope,
    store,
    ttlMs: 60_000
  });

  assert.deepEqual(result, {
    body: { created: true },
    replayed: true,
    status: 200
  });
});

test("idempotent execution reports an active owner", async () => {
  const store: IdempotencyStore = {
    async runAtomically() {
      return { kind: "in_progress" };
    }
  };

  await assert.rejects(
    executeIdempotently({
      execute: async () => assert.fail("owned work must not execute"),
      idempotencyKey: "active-1",
      input: { value: 1 },
      procedureId: "example.create",
      scope: globalScope,
      store,
      ttlMs: 60_000
    }),
    IdempotencyInProgressError
  );
});
