import type { RpcErrorResponse, RpcSuccessResponse, SystemPingResponse } from "@app/contracts";
import { systemPingRpcContract } from "@app/contracts";
import { Body, Controller, Headers, Inject, Post, Req, Res } from "@nestjs/common";
import { executeRpcProcedure } from "@product-foundation/rpc-server";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { SystemPingRpcHandler } from "./create-system-ping-rpc-handler.js";
import { SYSTEM_PING_RPC_HANDLER } from "./system.tokens.js";

@Controller()
export class SystemPingRpcController {
  constructor(
    @Inject(SYSTEM_PING_RPC_HANDLER)
    private readonly systemPing: SystemPingRpcHandler
  ) {}

  @Post(systemPingRpcContract.path)
  async pingSystem(
    @Body() body: unknown,
    @Headers("content-type") contentType: string | undefined,
    @Headers("x-idempotency-key") idempotencyKey: string | undefined,
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply
  ): Promise<RpcErrorResponse | RpcSuccessResponse<SystemPingResponse>> {
    const abortController = new AbortController();
    const onAborted = () => abortController.abort();
    const onResponseClosed = () => {
      if (!reply.raw.writableEnded) {
        abortController.abort();
      }
    };

    if (request.raw.aborted) {
      abortController.abort();
    } else {
      request.raw.once("aborted", onAborted);
      reply.raw.once("close", onResponseClosed);
    }

    try {
      const result = await executeRpcProcedure(systemPingRpcContract, this.systemPing, {
        body,
        contentType,
        idempotencyKey,
        logError: (error, context) => {
          request.log.error(
            {
              errorName: error instanceof Error ? error.name : "UnknownError",
              ...context
            },
            "Unhandled RPC procedure error"
          );
        },
        requestId: request.id,
        signal: abortController.signal
      });

      reply.header("x-request-id", result.requestId);
      reply.status(result.status);

      return result.body;
    } finally {
      request.raw.off("aborted", onAborted);
      reply.raw.off("close", onResponseClosed);
    }
  }
}
