import assert from "node:assert/strict";
import test from "node:test";
import { assertDurableJsonValue } from "./durable-json.js";

test("durable JSON accepts nested plain wire values", () => {
  assert.doesNotThrow(() =>
    assertDurableJsonValue({ flags: [true, false], nested: { count: 2 }, value: null })
  );
});

test("durable JSON rejects values PostgreSQL JSON serialization would transform", () => {
  assert.throws(() => assertDurableJsonValue({ value: undefined }), /not JSON-compatible/);
  assert.throws(() => assertDurableJsonValue({ value: Number.POSITIVE_INFINITY }), /non-finite/);
  assert.throws(() => assertDurableJsonValue({ value: new Date() }), /non-plain/);
  assert.throws(() => assertDurableJsonValue({ value: 1n }), /not JSON-compatible/);
});

test("durable JSON rejects circular and accessor-backed objects", () => {
  const circular: Record<string, unknown> = {};
  circular.self = circular;
  assert.throws(() => assertDurableJsonValue(circular), /circular/);

  const accessor = Object.defineProperty({}, "value", {
    enumerable: true,
    get: () => "computed"
  });
  assert.throws(() => assertDurableJsonValue(accessor), /non-data property/);
});

test("durable JSON rejects sparse, accessor-backed and decorated arrays", () => {
  const sparse: unknown[] = [];
  sparse.length = 2;
  assert.throws(() => assertDurableJsonValue(sparse), /sparse array/);

  const accessor = Object.defineProperty([], "0", {
    enumerable: true,
    get: () => "computed"
  });
  assert.throws(() => assertDurableJsonValue(accessor), /non-data array element/);

  const decorated: unknown[] & { extra?: string } = [];
  decorated.extra = "ignored by JSON.stringify";
  assert.throws(() => assertDurableJsonValue(decorated), /extra array property/);
});
