import assert from "node:assert/strict";
import test from "node:test";
import type { SqlExecutor, TransactionRunner } from "@product-foundation/backend-core";
import { PostgresOutboxStore } from "./postgres-outbox-store.js";

test("outbox rejects non-durable payloads before issuing SQL", async () => {
  let queryCount = 0;
  const sql: SqlExecutor = {
    async query() {
      queryCount += 1;
      return { rowCount: 0, rows: [] };
    }
  };
  const transactions: TransactionRunner = {
    async run(work) {
      return work(sql);
    }
  };
  const store = new PostgresOutboxStore(sql, transactions);

  await assert.rejects(
    store.append(sql, {
      aggregateId: "aggregate-1",
      aggregateType: "test",
      eventType: "test.created.v1",
      id: "6d75bea8-48d4-4bc4-b10d-f74b1834030f",
      occurredAt: new Date("2026-07-16T00:00:00.000Z"),
      payload: { value: new Date("2026-07-16T00:00:00.000Z") },
      schemaVersion: 1,
      scope: { kind: "global" }
    }),
    /non-plain object/
  );
  assert.equal(queryCount, 0);
});
