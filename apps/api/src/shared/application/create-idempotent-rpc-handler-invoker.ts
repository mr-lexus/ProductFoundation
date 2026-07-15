import {
  executeIdempotently,
  IdempotencyConflictError,
  IdempotencyInProgressError,
  type IdempotencyStore,
  type OperationScope
} from "@product-foundation/backend-core";
import { RpcApplicationError, type RpcHandlerInvoker } from "@product-foundation/rpc-server";

export function createIdempotentRpcHandlerInvoker(options: {
  readonly idempotencyKey: string | undefined;
  readonly leaseMs?: number;
  readonly scope: OperationScope;
  readonly store: IdempotencyStore;
  readonly ttlMs?: number;
}): RpcHandlerInvoker {
  return {
    async invoke({ context, handler, input, procedureId }) {
      if (options.idempotencyKey === undefined) {
        throw new Error("RPC validated mutation invocation without an idempotency key.");
      }
      try {
        const result = await executeIdempotently({
          execute: async () => ({
            body: await handler(input, context),
            status: 200
          }),
          idempotencyKey: options.idempotencyKey,
          input,
          leaseMs: options.leaseMs ?? 30_000,
          procedureId,
          scope: options.scope,
          store: options.store,
          ttlMs: options.ttlMs ?? 24 * 60 * 60 * 1_000
        });
        return result.body;
      } catch (error) {
        if (error instanceof IdempotencyConflictError) {
          throw new RpcApplicationError({
            code: "CONFLICT",
            message: error.message,
            status: 409
          });
        }
        if (error instanceof IdempotencyInProgressError) {
          throw new RpcApplicationError({
            code: "CONFLICT",
            message: error.message,
            retryable: true,
            status: 409
          });
        }
        throw error;
      }
    }
  };
}
