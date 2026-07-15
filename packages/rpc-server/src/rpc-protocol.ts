import type { RpcErrorCode, RpcErrorResponse } from "@product-foundation/rpc";

export type RpcHttpStatus = 200 | 400 | 401 | 403 | 404 | 409 | 413 | 415 | 422 | 429 | 500;

const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;
const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;

export function createRpcErrorResponse(
  requestId: string,
  code: RpcErrorCode,
  message: string,
  retryable: boolean,
  details?: unknown
): RpcErrorResponse {
  return {
    ok: false,
    error:
      details === undefined ? { code, message, retryable } : { code, details, message, retryable },
    meta: { requestId }
  };
}

export function resolveRequestId(
  candidate: string | undefined,
  createRequestId: () => string = () => crypto.randomUUID()
) {
  return candidate !== undefined && REQUEST_ID_PATTERN.test(candidate)
    ? candidate
    : createRequestId();
}

export function isValidIdempotencyKey(candidate: string | undefined) {
  return candidate === undefined || IDEMPOTENCY_KEY_PATTERN.test(candidate);
}

export function isJsonContentType(value: string | undefined) {
  return value?.toLowerCase().startsWith("application/json") ?? false;
}

export function getRpcHttpErrorDefinition(status: number): {
  readonly code: RpcErrorCode;
  readonly message: string;
  readonly retryable: boolean;
} {
  switch (status) {
    case 400:
    case 422:
      return {
        code: "BAD_REQUEST",
        message: "The RPC request is malformed.",
        retryable: false
      };
    case 401:
      return {
        code: "UNAUTHORIZED",
        message: "Authentication is required.",
        retryable: false
      };
    case 403:
      return {
        code: "FORBIDDEN",
        message: "The operation is not permitted.",
        retryable: false
      };
    case 404:
      return {
        code: "NOT_FOUND",
        message: "The RPC procedure was not found.",
        retryable: false
      };
    case 409:
      return {
        code: "CONFLICT",
        message: "The operation conflicts with the current state.",
        retryable: false
      };
    case 413:
      return {
        code: "PAYLOAD_TOO_LARGE",
        message: "RPC request body is too large.",
        retryable: false
      };
    case 415:
      return {
        code: "UNSUPPORTED_MEDIA_TYPE",
        message: "RPC requests must use application/json.",
        retryable: false
      };
    case 429:
      return {
        code: "RATE_LIMITED",
        message: "Too many RPC requests.",
        retryable: true
      };
    default:
      return {
        code: "INTERNAL_ERROR",
        message: "The server could not complete the RPC request.",
        retryable: true
      };
  }
}
