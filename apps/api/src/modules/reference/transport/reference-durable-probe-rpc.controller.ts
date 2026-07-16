import type {
  ReferenceDurableProbe,
  ReferenceDurableProbeCreateOutput,
  RpcErrorResponse,
  RpcSuccessResponse
} from "@app/contracts";
import {
  referenceDurableProbeCreateRpcContract,
  referenceDurableProbeStatusRpcContract
} from "@app/contracts";
import { Body, Controller, Headers, Inject, Post, Req, Res } from "@nestjs/common";
import { globalScope, type IdempotencyStore } from "@product-foundation/backend-core";
import { executeRpcProcedure } from "@product-foundation/rpc-server";
import type { FastifyReply, FastifyRequest } from "fastify";
import {
  createIdempotentRpcHandlerInvoker,
  type IdempotentRpcMutationHandler
} from "../../../shared/application/create-idempotent-rpc-handler-invoker.js";
import { IDEMPOTENCY_STORE } from "../../../shared/application/database.tokens.js";
import type { ReferenceDurableProbeCreateInput } from "../contract/index.js";
import type { ReferenceDurableProbeStatusRpcHandler } from "./create-reference-durable-probe-status-rpc-handler.js";
import {
  REFERENCE_DURABLE_PROBE_CREATE_HANDLER,
  REFERENCE_DURABLE_PROBE_STATUS_HANDLER
} from "./reference.tokens.js";

function requestAbort(request: FastifyRequest, reply: FastifyReply) {
  const controller = new AbortController();
  const onAborted = () => controller.abort();
  const onClosed = () => {
    if (!reply.raw.writableEnded) {
      controller.abort();
    }
  };
  if (request.raw.aborted) {
    controller.abort();
  } else {
    request.raw.once("aborted", onAborted);
    reply.raw.once("close", onClosed);
  }
  return {
    cleanup() {
      request.raw.off("aborted", onAborted);
      reply.raw.off("close", onClosed);
    },
    signal: controller.signal
  };
}

@Controller()
export class ReferenceDurableProbeRpcController {
  constructor(
    @Inject(REFERENCE_DURABLE_PROBE_CREATE_HANDLER)
    private readonly createProbe: IdempotentRpcMutationHandler<
      ReferenceDurableProbeCreateInput,
      ReferenceDurableProbeCreateOutput
    >,
    @Inject(REFERENCE_DURABLE_PROBE_STATUS_HANDLER)
    private readonly probeStatus: ReferenceDurableProbeStatusRpcHandler,
    @Inject(IDEMPOTENCY_STORE)
    private readonly idempotency: IdempotencyStore
  ) {}

  @Post(referenceDurableProbeCreateRpcContract.path)
  async create(
    @Body() body: unknown,
    @Headers("content-type") contentType: string | undefined,
    @Headers("x-idempotency-key") idempotencyKey: string | undefined,
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply
  ): Promise<RpcErrorResponse | RpcSuccessResponse<ReferenceDurableProbeCreateOutput>> {
    const abort = requestAbort(request, reply);
    try {
      const result = await executeRpcProcedure(
        referenceDurableProbeCreateRpcContract,
        this.createProbe,
        {
          body,
          contentType,
          handlerInvoker: createIdempotentRpcHandlerInvoker({
            idempotencyKey,
            scope: globalScope,
            store: this.idempotency
          }),
          idempotencyKey,
          logError: (error, context) => {
            request.log.error(
              { errorName: error instanceof Error ? error.name : "UnknownError", ...context },
              "Unhandled reference durable mutation error"
            );
          },
          requestId: request.id,
          signal: abort.signal
        }
      );
      reply.header("x-request-id", result.requestId);
      reply.status(result.status);
      return result.body;
    } finally {
      abort.cleanup();
    }
  }

  @Post(referenceDurableProbeStatusRpcContract.path)
  async status(
    @Body() body: unknown,
    @Headers("content-type") contentType: string | undefined,
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply
  ): Promise<RpcErrorResponse | RpcSuccessResponse<ReferenceDurableProbe>> {
    const abort = requestAbort(request, reply);
    try {
      const result = await executeRpcProcedure(
        referenceDurableProbeStatusRpcContract,
        this.probeStatus,
        {
          body,
          contentType,
          logError: (error, context) => {
            request.log.error(
              { errorName: error instanceof Error ? error.name : "UnknownError", ...context },
              "Unhandled reference durable query error"
            );
          },
          requestId: request.id,
          signal: abort.signal
        }
      );
      reply.header("x-request-id", result.requestId);
      reply.status(result.status);
      return result.body;
    } finally {
      abort.cleanup();
    }
  }
}
