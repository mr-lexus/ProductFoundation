import type { ZodSchema } from "zod";

export interface RpcProcedureContract<TInput, TOutput> {
  readonly method: "POST";
  readonly path: `/rpc/${string}`;
  readonly inputSchema: ZodSchema<TInput>;
  readonly outputSchema: ZodSchema<TOutput>;
}

export function defineRpcProcedure<TInput, TOutput>(
  contract: RpcProcedureContract<TInput, TOutput>
) {
  return contract;
}
