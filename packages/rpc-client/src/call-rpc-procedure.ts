import {
  createRpcSuccessResponseSchema,
  type RpcCallResult,
  type RpcProcedureContract,
  rpcErrorResponseSchema
} from "@product-foundation/rpc";
import { RpcClientError } from "./rpc-client-error.js";

export interface RpcClientConfig {
  readonly apiBaseUrl: string;
  readonly fetch?: typeof fetch;
  readonly headers?: Readonly<Record<string, string>>;
}

export interface RpcCallOptions {
  readonly idempotencyKey?: string;
  readonly signal?: AbortSignal;
}

function normalizeApiBaseUrl(apiBaseUrl: string) {
  return apiBaseUrl.replace(/\/+$/, "");
}

export async function callRpcProcedure<TInput, TOutput>(
  config: RpcClientConfig,
  contract: RpcProcedureContract<TInput, TOutput>,
  input: TInput,
  options: RpcCallOptions = {}
): Promise<RpcCallResult<TOutput>> {
  const parsedInput = contract.inputSchema.safeParse(input);
  if (!parsedInput.success) {
    throw new RpcClientError({
      code: "INVALID_INPUT",
      details: parsedInput.error.issues,
      message: `Invalid input for RPC procedure ${contract.id}.`
    });
  }

  const headers: Record<string, string> = {
    "content-type": "application/json",
    ...config.headers
  };
  if (options.idempotencyKey !== undefined) {
    headers["x-idempotency-key"] = options.idempotencyKey;
  }

  let response: Response;
  try {
    response = await (config.fetch ?? fetch)(
      `${normalizeApiBaseUrl(config.apiBaseUrl)}${contract.path}`,
      {
        body: JSON.stringify(parsedInput.data),
        credentials: "include",
        headers,
        method: contract.method,
        signal: options.signal
      }
    );
  } catch (error) {
    throw new RpcClientError({
      cause: error,
      code: options.signal?.aborted ? "REQUEST_ABORTED" : "NETWORK_ERROR",
      message: options.signal?.aborted
        ? `RPC procedure ${contract.id} was cancelled.`
        : `RPC procedure ${contract.id} could not reach the server.`,
      retryable: !options.signal?.aborted
    });
  }

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const parsedError = rpcErrorResponseSchema.safeParse(payload);
    if (parsedError.success) {
      throw new RpcClientError({
        code: parsedError.data.error.code,
        details: parsedError.data.error.details,
        message: parsedError.data.error.message,
        requestId: parsedError.data.meta.requestId,
        retryable: parsedError.data.error.retryable,
        status: response.status
      });
    }

    throw new RpcClientError({
      code: "INVALID_RESPONSE",
      message: `RPC procedure ${contract.id} returned an invalid error response.`,
      retryable: response.status >= 500,
      status: response.status
    });
  }

  const responseSchema = createRpcSuccessResponseSchema(contract.outputSchema);
  const parsedResponse = responseSchema.safeParse(payload);
  if (!parsedResponse.success) {
    throw new RpcClientError({
      code: "INVALID_RESPONSE",
      details: parsedResponse.error.issues,
      message: `RPC procedure ${contract.id} returned an invalid response.`,
      requestId: response.headers.get("x-request-id") ?? undefined,
      status: response.status
    });
  }

  return {
    data: parsedResponse.data.data,
    meta: parsedResponse.data.meta
  };
}
