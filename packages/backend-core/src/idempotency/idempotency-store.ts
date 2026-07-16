import { createHash } from "node:crypto";
import type { SqlExecutor } from "../ports/database.js";
import type { OperationScope } from "../security/request-context.js";

export type IdempotencyStoreResult<TBody> =
  | { readonly kind: "conflict" }
  | {
      readonly kind: "executed";
      readonly responseBody: TBody;
      readonly responseStatus: number;
    }
  | { readonly kind: "in_progress" }
  | {
      readonly kind: "replay";
      readonly responseBody: TBody;
      readonly responseStatus: number;
    };

export interface IdempotencyKey {
  readonly key: string;
  readonly procedureId: string;
  readonly requestHash: string;
  readonly scope: OperationScope;
}

export interface IdempotencyOwnership {
  readonly ownerId: string;
}

export interface IdempotencyStore {
  runAtomically<TBody>(
    key: IdempotencyKey,
    options: IdempotencyOwnership & {
      readonly leaseMs: number;
      readonly ttlMs: number;
    },
    execute: (
      transaction: SqlExecutor
    ) => Promise<{ readonly body: TBody; readonly status: number }>
  ): Promise<IdempotencyStoreResult<TBody>>;
}

export function hashIdempotencyPayload(payload: string | Uint8Array) {
  return createHash("sha256").update(payload).digest("hex");
}

function stableJsonValue(value: unknown, seen: Set<object>): string {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new TypeError("Idempotency payload contains a non-finite number.");
    }
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    if (seen.has(value)) {
      throw new TypeError("Idempotency payload contains a circular reference.");
    }
    seen.add(value);
    const serialized = `[${value.map((item) => stableJsonValue(item, seen)).join(",")}]`;
    seen.delete(value);
    return serialized;
  }
  if (typeof value === "object") {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError("Idempotency payload contains a non-plain object.");
    }
    if (seen.has(value)) {
      throw new TypeError("Idempotency payload contains a circular reference.");
    }
    seen.add(value);
    const record = value as Readonly<Record<string, unknown>>;
    const serialized = `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJsonValue(record[key], seen)}`)
      .join(",")}}`;
    seen.delete(value);
    return serialized;
  }
  throw new TypeError("Idempotency payload must be JSON-compatible.");
}

export function hashIdempotencyValue(value: unknown) {
  return hashIdempotencyPayload(stableJsonValue(value, new Set()));
}
