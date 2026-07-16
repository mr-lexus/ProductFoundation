import type { SqlExecutor } from "../ports/database.js";
import type { OperationScope } from "../security/request-context.js";
import {
  hashIdempotencyValue,
  type IdempotencyKey,
  type IdempotencyStore
} from "./idempotency-store.js";

export class IdempotencyConflictError extends Error {
  constructor() {
    super("The idempotency key was already used for another request.");
    this.name = "IdempotencyConflictError";
  }
}

export class IdempotencyInProgressError extends Error {
  constructor() {
    super("A request with this idempotency key is already in progress.");
    this.name = "IdempotencyInProgressError";
  }
}

export interface IdempotentExecutionResult<TBody> {
  readonly body: TBody;
  readonly replayed: boolean;
  readonly status: number;
}

export async function executeIdempotently<TBody>(options: {
  readonly execute: (
    transaction: SqlExecutor
  ) => Promise<{ readonly body: TBody; readonly status: number }>;
  readonly idempotencyKey: string;
  readonly input: unknown;
  readonly leaseMs: number;
  readonly procedureId: string;
  readonly scope: OperationScope;
  readonly store: IdempotencyStore;
  readonly ttlMs: number;
}): Promise<IdempotentExecutionResult<TBody>> {
  if (options.leaseMs <= 0 || options.ttlMs < options.leaseMs) {
    throw new RangeError("Idempotency TTL must be at least as long as its positive lease.");
  }
  const key: IdempotencyKey = {
    key: options.idempotencyKey,
    procedureId: options.procedureId,
    requestHash: hashIdempotencyValue(options.input),
    scope: options.scope
  };
  const ownership = { ownerId: crypto.randomUUID() };
  const result = await options.store.runAtomically(
    key,
    {
      ...ownership,
      leaseMs: options.leaseMs,
      ttlMs: options.ttlMs
    },
    options.execute
  );

  if (result.kind === "conflict") {
    throw new IdempotencyConflictError();
  }
  if (result.kind === "in_progress") {
    throw new IdempotencyInProgressError();
  }
  if (result.kind === "replay") {
    return {
      body: result.responseBody,
      replayed: true,
      status: result.responseStatus
    };
  }
  return {
    body: result.responseBody,
    replayed: false,
    status: result.responseStatus
  };
}
