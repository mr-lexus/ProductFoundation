import {
  Catch,
  HttpException,
  Inject,
  type ArgumentsHost,
  type ExceptionFilter
} from "@nestjs/common";
import { HttpAdapterHost } from "@nestjs/core";
import {
  createRpcErrorResponse,
  getRpcHttpErrorDefinition,
  resolveRequestId
} from "@product-foundation/rpc-server";

interface HttpRequestLike {
  readonly headers?: Readonly<Record<string, string | string[] | undefined>>;
  readonly originalUrl?: string;
  readonly url?: string;
}

function resolveHttpStatus(exception: unknown) {
  if (exception instanceof HttpException) {
    return exception.getStatus();
  }

  if (
    typeof exception === "object" &&
    exception !== null &&
    "statusCode" in exception &&
    typeof exception.statusCode === "number"
  ) {
    return exception.statusCode;
  }

  return 500;
}

function firstHeader(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

@Catch()
export class RpcHttpExceptionFilter implements ExceptionFilter {
  constructor(
    @Inject(HttpAdapterHost)
    private readonly adapterHost: HttpAdapterHost
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const request = http.getRequest<HttpRequestLike>();
    const response = http.getResponse();
    const status = resolveHttpStatus(exception);
    const definition = getRpcHttpErrorDefinition(status);
    const requestId = resolveRequestId(
      firstHeader(request.headers?.["x-request-id"])
    );
    const url = request.originalUrl ?? request.url ?? "";
    const { httpAdapter } = this.adapterHost;

    if (status >= 500) {
      process.stderr.write(
        `${JSON.stringify({
          errorName: exception instanceof Error ? exception.name : "UnknownError",
          event: "http_request_failed",
          level: "error",
          message:
            exception instanceof Error ? exception.message : "Unknown error",
          requestId,
          url
        })}\n`
      );
    }

    httpAdapter.setHeader(response, "x-request-id", requestId);

    if (url.startsWith("/rpc/")) {
      httpAdapter.reply(
        response,
        createRpcErrorResponse(
          requestId,
          definition.code,
          definition.message,
          definition.retryable
        ),
        status
      );
      return;
    }

    httpAdapter.reply(
      response,
      {
        message: status >= 500 ? "Internal server error" : definition.message,
        requestId,
        statusCode: status
      },
      status
    );
  }
}
