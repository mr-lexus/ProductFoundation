import {
  executeIdempotently,
  IdempotencyConflictError,
  IdempotencyInProgressError,
  type IdempotencyStore,
  type OperationScope,
  type SqlExecutor
} from "@product-foundation/backend-core";
import {
  RpcApplicationError,
  type RpcHandler,
  type RpcHandlerInvoker
} from "@product-foundation/rpc-server";

export interface RpcMutationExecution {
  readonly transaction: SqlExecutor;
}

export type IdempotentRpcMutationHandler<TInput, TOutput> = RpcHandler<
  TInput,
  TOutput,
  RpcMutationExecution
>;

export function createIdempotentRpcHandlerInvoker(options: {
  readonly idempotencyKey: string | undefined;
  readonly scope: OperationScope;
  readonly store: IdempotencyStore;
  readonly ttlMs?: number;
}): RpcHandlerInvoker<RpcMutationExecution> {
  return {
    async invoke({ context, handler, input, procedureId, validateOutput }) {
      if (options.idempotencyKey === undefined) {
        throw new Error("RPC validated mutation invocation without an idempotency key.");
      }
      try {
        const result = await executeIdempotently({
          execute: async (transaction) => {
            const output = await handler(input, {
              ...context,
              execution: { transaction }
            });
            return {
              body: validateOutput(output),
              status: 200
            };
          },
          idempotencyKey: options.idempotencyKey,
          input,
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
            message: error.message
          });
        }
        if (error instanceof IdempotencyInProgressError) {
          throw new RpcApplicationError({
            code: "CONFLICT",
            message: error.message,
            retryable: true
          });
        }
        throw error;
      }
    }
  };
}
