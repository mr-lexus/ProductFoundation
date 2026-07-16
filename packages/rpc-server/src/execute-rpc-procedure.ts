import type {
  RpcErrorResponse,
  RpcProcedureContract,
  RpcSuccessResponse
} from "@product-foundation/rpc";
import { assertRpcWireValueStable } from "@product-foundation/rpc";
import { RpcApplicationError } from "./rpc-application-error.js";
import type { RpcActor, RpcHandler, RpcHandlerInvoker, RpcRequestContext } from "./rpc-handler.js";
import {
  createRpcErrorResponse,
  isJsonContentType,
  isValidIdempotencyKey,
  type RpcHttpStatus,
  resolveRequestId
} from "./rpc-protocol.js";

interface ExecuteRpcProcedureBaseOptions {
  readonly actor?: RpcActor | null;
  readonly body: unknown;
  readonly contentType?: string;
  readonly createRequestId?: () => string;
  readonly idempotencyKey?: string;
  readonly logError: (error: unknown, context: { procedureId: string; requestId: string }) => void;
  readonly now?: () => Date;
  readonly requestId?: string;
  readonly signal: AbortSignal;
}

type ExecuteRpcProcedureOptions<TExecution> = ExecuteRpcProcedureBaseOptions &
  ([TExecution] extends [undefined]
    ? { readonly handlerInvoker?: RpcHandlerInvoker<undefined> }
    : { readonly handlerInvoker: RpcHandlerInvoker<TExecution> });

export interface RpcExecutionResult<TOutput> {
  readonly body: RpcErrorResponse | RpcSuccessResponse<TOutput>;
  readonly requestId: string;
  readonly status: RpcHttpStatus;
}

function validateOutput<TInput, TOutput>(
  contract: RpcProcedureContract<TInput, TOutput>,
  output: unknown
) {
  const parsedOutput = contract.outputSchema.safeParse(output);
  if (!parsedOutput.success) {
    throw new Error(`RPC procedure ${contract.id} returned an invalid output.`);
  }
  assertRpcWireValueStable(
    contract.outputSchema,
    parsedOutput.data,
    `Output for RPC procedure ${contract.id}`
  );
  return parsedOutput.data;
}

export async function executeRpcProcedure<TInput, TOutput, TExecution = undefined>(
  contract: RpcProcedureContract<TInput, TOutput>,
  handler: RpcHandler<TInput, TOutput, TExecution>,
  options: ExecuteRpcProcedureOptions<TExecution>
): Promise<RpcExecutionResult<TOutput>> {
  const now = options.now ?? (() => new Date());
  const requestId = resolveRequestId(options.requestId, options.createRequestId);
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

  if (contract.kind === "mutation" && options.idempotencyKey === undefined) {
    return {
      body: createRpcErrorResponse(
        requestId,
        "BAD_REQUEST",
        "X-Idempotency-Key is required for this mutation.",
        false
      ),
      requestId,
      status: 400
    };
  }
  if (contract.kind === "mutation" && options.handlerInvoker === undefined) {
    options.logError(new Error(`RPC mutation ${contract.id} has no durable handler invoker.`), {
      procedureId: contract.id,
      requestId
    });
    return {
      body: createRpcErrorResponse(
        requestId,
        "INTERNAL_ERROR",
        "The server could not complete the RPC request.",
        false
      ),
      requestId,
      status: 500
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
    assertRpcWireValueStable(
      contract.inputSchema,
      parsedInput.data,
      `Input for RPC procedure ${contract.id}`
    );
  } catch {
    return {
      body: createRpcErrorResponse(
        requestId,
        "BAD_REQUEST",
        "RPC input must be JSON-compatible after validation.",
        false
      ),
      requestId,
      status: 400
    };
  }

  try {
    const context: RpcRequestContext<undefined> = {
      actor: options.actor ?? null,
      execution: undefined,
      idempotencyKey: options.idempotencyKey ?? null,
      receivedAt,
      requestId,
      signal: options.signal
    };
    const handlerInvoker = options.handlerInvoker as RpcHandlerInvoker<TExecution> | undefined;
    const output =
      handlerInvoker === undefined
        ? await handler(parsedInput.data, context as RpcRequestContext<TExecution>)
        : await handlerInvoker.invoke({
            context,
            handler,
            input: parsedInput.data,
            procedureId: contract.id,
            validateOutput: (candidate) => validateOutput(contract, candidate)
          });
    const validatedOutput = validateOutput(contract, output);

    return {
      body: {
        ok: true,
        data: validatedOutput,
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
