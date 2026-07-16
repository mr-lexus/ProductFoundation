import { type ZodSchema, type ZodType, z } from "zod";

export type RpcJsonPrimitive = boolean | number | string | null;
export type RpcJsonValue =
  | RpcJsonPrimitive
  | readonly RpcJsonValue[]
  | { readonly [key: string]: RpcJsonValue };

export const rpcJsonValueSchema: ZodType<RpcJsonValue> = z.lazy(() =>
  z.union([
    z.boolean(),
    z.number().finite(),
    z.string(),
    z.null(),
    z.array(rpcJsonValueSchema),
    z.record(rpcJsonValueSchema)
  ])
);

export function assertRpcJsonValue(
  value: unknown,
  label = "RPC value"
): asserts value is RpcJsonValue {
  const seen = new Set<object>();

  function visit(candidate: unknown): void {
    if (candidate === null || typeof candidate === "boolean" || typeof candidate === "string") {
      return;
    }
    if (typeof candidate === "number") {
      if (!Number.isFinite(candidate)) {
        throw new TypeError(`${label} contains a non-finite number.`);
      }
      return;
    }
    if (typeof candidate !== "object") {
      throw new TypeError(`${label} is not JSON-compatible.`);
    }
    if (seen.has(candidate)) {
      throw new TypeError(`${label} contains a circular reference.`);
    }

    const prototype = Object.getPrototypeOf(candidate);
    if (!Array.isArray(candidate) && prototype !== Object.prototype && prototype !== null) {
      throw new TypeError(`${label} contains a non-plain object.`);
    }

    seen.add(candidate);
    if (Array.isArray(candidate)) {
      for (const item of candidate) {
        visit(item);
      }
    } else {
      for (const item of Object.values(candidate as Readonly<Record<string, unknown>>)) {
        visit(item);
      }
    }
    seen.delete(candidate);
  }

  visit(value);
}

export function assertRpcWireValueStable<T>(schema: ZodSchema<T>, value: T, label: string): void {
  assertRpcJsonValue(value, label);
  const serialized = JSON.stringify(value);
  if (serialized === undefined) {
    throw new TypeError(`${label} cannot be serialized as JSON.`);
  }
  const reparsedWireValue: unknown = JSON.parse(serialized);
  const roundTrip = schema.safeParse(reparsedWireValue);
  if (!roundTrip.success) {
    throw new TypeError(`${label} cannot be parsed after a JSON round trip.`);
  }
  assertRpcJsonValue(roundTrip.data, label);
  if (JSON.stringify(roundTrip.data) !== serialized) {
    throw new TypeError(`${label} schema transformations are not stable on the JSON wire.`);
  }
}

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
    details: rpcJsonValueSchema.optional()
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
