import type {
  RpcErrorResponse,
  RpcProcedureContract,
  RpcSuccessResponse
} from "@product-foundation/rpc";
import { RpcApplicationError } from "./rpc-application-error.js";
import type {
  RpcActor,
  RpcHandler
} from "./rpc-handler.js";
import {
  createRpcErrorResponse,
  isJsonContentType,
  isValidIdempotencyKey,
  resolveRequestId,
  type RpcHttpStatus
} from "./rpc-protocol.js";

interface ExecuteRpcProcedureOptions {
  readonly actor?: RpcActor | null;
  readonly body: unknown;
  readonly contentType?: string;
  readonly createRequestId?: () => string;
  readonly idempotencyKey?: string;
  readonly logError: (
    error: unknown,
    context: { procedureId: string; requestId: string }
  ) => void;
  readonly now?: () => Date;
  readonly requestId?: string;
  readonly signal: AbortSignal;
}

export interface RpcExecutionResult<TOutput> {
  readonly body: RpcErrorResponse | RpcSuccessResponse<TOutput>;
  readonly requestId: string;
  readonly status: RpcHttpStatus;
}

export async function executeRpcProcedure<TInput, TOutput>(
  contract: RpcProcedureContract<TInput, TOutput>,
  handler: RpcHandler<TInput, TOutput>,
  options: ExecuteRpcProcedureOptions
): Promise<RpcExecutionResult<TOutput>> {
  const now = options.now ?? (() => new Date());
  const requestId = resolveRequestId(
    options.requestId,
    options.createRequestId
  );
  const receivedAt = now();

  if (!isJsonContentType(options.contentType)) {
    return {
      body: createRpcErrorResponse(
        requestId,
        "UNSUPPORTED_MEDIA_TYPE",
        "RPC requests must use application/json.",
        false
      ),
      requestId,
      status: 415
    };
  }

  if (!isValidIdempotencyKey(options.idempotencyKey)) {
    return {
      body: createRpcErrorResponse(
        requestId,
        "BAD_REQUEST",
        "X-Idempotency-Key contains unsupported characters.",
        false
      ),
      requestId,
      status: 400
    };
  }

  const parsedInput = contract.inputSchema.safeParse(options.body);
  if (!parsedInput.success) {
    return {
      body: createRpcErrorResponse(
        requestId,
        "BAD_REQUEST",
        "RPC input validation failed.",
        false,
        parsedInput.error.issues.map((issue) => ({
          code: issue.code,
          message: issue.message,
          path: issue.path
        }))
      ),
      requestId,
      status: 400
    };
  }

  try {
    const output = await handler(parsedInput.data, {
      actor: options.actor ?? null,
      idempotencyKey: options.idempotencyKey ?? null,
      receivedAt,
      requestId,
      signal: options.signal
    });
    const parsedOutput = contract.outputSchema.safeParse(output);

    if (!parsedOutput.success) {
      throw new Error(
        `RPC procedure ${contract.id} returned an invalid output.`
      );
    }

    return {
      body: {
        ok: true,
        data: parsedOutput.data,
        meta: {
          requestId,
          servedAt: now().toISOString()
        }
      },
      requestId,
      status: 200
    };
  } catch (error) {
    if (error instanceof RpcApplicationError) {
      return {
        body: createRpcErrorResponse(
          requestId,
          error.code,
          error.message,
          error.retryable,
          error.details
        ),
        requestId,
        status: error.status
      };
    }

    options.logError(error, { procedureId: contract.id, requestId });

    return {
      body: createRpcErrorResponse(
        requestId,
        "INTERNAL_ERROR",
        "The server could not complete the RPC request.",
        true
      ),
      requestId,
      status: 500
    };
  }
}
