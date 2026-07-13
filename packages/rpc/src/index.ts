import { z, type ZodSchema } from "zod";

export const rpcProcedureKindSchema = z.enum(["query", "mutation"]);

export type RpcProcedureKind = z.infer<typeof rpcProcedureKindSchema>;

export const rpcErrorCodeSchema = z.enum([
  "BAD_REQUEST",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "PAYLOAD_TOO_LARGE",
  "UNSUPPORTED_MEDIA_TYPE",
  "RATE_LIMITED",
  "INTERNAL_ERROR"
]);

export type RpcErrorCode = z.infer<typeof rpcErrorCodeSchema>;

export const rpcResponseMetaSchema = z.object({
  requestId: z.string().min(1),
  servedAt: z.string().datetime()
});

export type RpcResponseMeta = z.infer<typeof rpcResponseMetaSchema>;

export const rpcErrorResponseSchema = z.object({
  ok: z.literal(false),
  error: z.object({
    code: rpcErrorCodeSchema,
    message: z.string(),
    retryable: z.boolean(),
    details: z.unknown().optional()
  }),
  meta: z.object({
    requestId: z.string().min(1)
  })
});

export type RpcErrorResponse = z.infer<typeof rpcErrorResponseSchema>;

export interface RpcSuccessResponse<TOutput> {
  readonly ok: true;
  readonly data: TOutput;
  readonly meta: RpcResponseMeta;
}

export interface RpcCallResult<TOutput> {
  readonly data: TOutput;
  readonly meta: RpcResponseMeta;
}

export interface RpcProcedureContract<TInput, TOutput> {
  readonly id: `${string}.${string}`;
  readonly kind: RpcProcedureKind;
  readonly method: "POST";
  readonly path: `/rpc/v${number}/${string}`;
  readonly inputSchema: ZodSchema<TInput>;
  readonly outputSchema: ZodSchema<TOutput>;
}

export function defineRpcProcedure<TInput, TOutput>(
  contract: RpcProcedureContract<TInput, TOutput>
): RpcProcedureContract<TInput, TOutput> {
  return contract;
}

export function createRpcSuccessResponseSchema<TOutput>(
  outputSchema: ZodSchema<TOutput>
): ZodSchema<RpcSuccessResponse<TOutput>> {
  return z.object({
    ok: z.literal(true),
    data: outputSchema,
    meta: rpcResponseMetaSchema
  }) as ZodSchema<RpcSuccessResponse<TOutput>>;
}
