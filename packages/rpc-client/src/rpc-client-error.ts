import type { RpcErrorCode } from "@product-foundation/rpc";

export type RpcClientErrorCode =
  | RpcErrorCode
  | "INVALID_INPUT"
  | "INVALID_RESPONSE"
  | "NETWORK_ERROR"
  | "REQUEST_ABORTED";

interface RpcClientErrorOptions {
  readonly cause?: unknown;
  readonly code: RpcClientErrorCode;
  readonly details?: unknown;
  readonly message: string;
  readonly requestId?: string;
  readonly retryable?: boolean;
  readonly status?: number;
}

export class RpcClientError extends Error {
  readonly code: RpcClientErrorCode;
  readonly details: unknown;
  readonly requestId: string | null;
  readonly retryable: boolean;
  readonly status: number | null;

  constructor(options: RpcClientErrorOptions) {
    super(options.message, { cause: options.cause });
    this.name = "RpcClientError";
    this.code = options.code;
    this.details = options.details;
    this.requestId = options.requestId ?? null;
    this.retryable = options.retryable ?? false;
    this.status = options.status ?? null;
  }
}
