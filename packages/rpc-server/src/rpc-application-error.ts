import type { RpcErrorCode } from "@product-foundation/rpc";

export type RpcHttpErrorStatus = 400 | 401 | 403 | 404 | 409 | 413 | 415 | 429;

interface RpcApplicationErrorOptions {
  readonly code: Exclude<RpcErrorCode, "INTERNAL_ERROR">;
  readonly details?: unknown;
  readonly message: string;
  readonly retryable?: boolean;
  readonly status: RpcHttpErrorStatus;
}

export class RpcApplicationError extends Error {
  readonly code: Exclude<RpcErrorCode, "INTERNAL_ERROR">;
  readonly details: unknown;
  readonly retryable: boolean;
  readonly status: RpcHttpErrorStatus;

  constructor(options: RpcApplicationErrorOptions) {
    super(options.message);
    this.name = "RpcApplicationError";
    this.code = options.code;
    this.details = options.details;
    this.retryable = options.retryable ?? false;
    this.status = options.status;
  }
}
