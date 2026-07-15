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
  readonly execute: () => Promise<{ readonly body: TBody; readonly status: number }>;
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
  const claim = await options.store.claim(key, {
    ...ownership,
    leaseMs: options.leaseMs,
    ttlMs: options.ttlMs
  });

  if (claim.kind === "conflict") {
    throw new IdempotencyConflictError();
  }
  if (claim.kind === "in_progress") {
    throw new IdempotencyInProgressError();
  }
  if (claim.kind === "replay") {
    return {
      body: claim.responseBody as TBody,
      replayed: true,
      status: claim.responseStatus
    };
  }

  try {
    const response = await options.execute();
    await options.store.complete(key, ownership, response);
    return { ...response, replayed: false };
  } catch (error) {
    try {
      await options.store.release(key, ownership);
    } catch (releaseError) {
      throw new AggregateError(
        [error, releaseError],
        "Idempotent execution failed and its lease could not be released."
      );
    }
    throw error;
  }
}
