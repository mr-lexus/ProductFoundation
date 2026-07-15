import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  Inject
} from "@nestjs/common";
import { HttpAdapterHost } from "@nestjs/core";
import { createRpcErrorResponse, getRpcHttpErrorDefinition } from "@product-foundation/rpc-server";
import type { FastifyRequest } from "fastify";

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

@Catch()
export class RpcHttpExceptionFilter implements ExceptionFilter {
  constructor(
    @Inject(HttpAdapterHost)
    private readonly adapterHost: HttpAdapterHost
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const request = http.getRequest<FastifyRequest>();
    const response = http.getResponse();
    const status = resolveHttpStatus(exception);
    const definition = getRpcHttpErrorDefinition(status);
    const requestId = request.id;
    const url = request.url;
    const { httpAdapter } = this.adapterHost;

    if (status >= 500) {
      request.log.error(
        {
          errorName: exception instanceof Error ? exception.name : "UnknownError",
          event: "http_request_failed",
          requestId
        },
        "HTTP request failed"
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
