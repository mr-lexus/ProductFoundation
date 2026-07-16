import { assertRpcJsonValue, type RpcErrorCode, type RpcJsonValue } from "@product-foundation/rpc";

export type RpcHttpErrorStatus = 400 | 401 | 403 | 404 | 409 | 413 | 415 | 429;

interface RpcApplicationErrorOptions {
  readonly code: Exclude<RpcErrorCode, "INTERNAL_ERROR">;
  readonly details?: RpcJsonValue;
  readonly message: string;
  readonly retryable?: boolean;
}

const statusByCode: Readonly<Record<Exclude<RpcErrorCode, "INTERNAL_ERROR">, RpcHttpErrorStatus>> =
  {
    BAD_REQUEST: 400,
    CONFLICT: 409,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    PAYLOAD_TOO_LARGE: 413,
    RATE_LIMITED: 429,
    UNAUTHORIZED: 401,
    UNSUPPORTED_MEDIA_TYPE: 415
  };

export class RpcApplicationError extends Error {
  readonly code: Exclude<RpcErrorCode, "INTERNAL_ERROR">;
  readonly details: RpcJsonValue | undefined;
  readonly retryable: boolean;
  readonly status: RpcHttpErrorStatus;

  constructor(options: RpcApplicationErrorOptions) {
    super(options.message);
    if (options.details !== undefined) {
      assertRpcJsonValue(options.details, "RPC application error details");
    }
    this.name = "RpcApplicationError";
    this.code = options.code;
    this.details = options.details;
    this.retryable = options.retryable ?? false;
    this.status = statusByCode[options.code];
  }
}
