import "reflect-metadata";
import type { IncomingMessage } from "node:http";
import type { Http2ServerRequest } from "node:http2";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  type NestFastifyApplication
} from "@nestjs/platform-fastify";
import type { ApiRuntimeConfig } from "./config/load-api-config.js";
import { AppModule } from "./app.module.js";
import { resolveRequestId } from "@product-foundation/rpc-server";
import { MetricsService } from "./observability/metrics.service.js";

interface CreateNestApplicationOptions {
  readonly logger?: boolean;
}

type NestRuntimeConfig = Pick<
  ApiRuntimeConfig,
  | "corsOrigins"
  | "database"
  | "environment"
  | "logLevel"
  | "maxRpcBodyBytes"
  | "rateLimit"
  | "trustProxy"
>;

export async function createNestApplication(
  config: NestRuntimeConfig,
  options: CreateNestApplicationOptions = {}
) {
  const application = await NestFactory.create<NestFastifyApplication>(
    AppModule.register(config),
    new FastifyAdapter({
      bodyLimit: config.maxRpcBodyBytes,
      genReqId: (request: IncomingMessage | Http2ServerRequest) => {
        const header = request.headers["x-request-id"];
        return resolveRequestId(Array.isArray(header) ? header[0] : header);
      },
      logger:
        options.logger === false
          ? false
          : {
              level: config.logLevel,
              redact: {
                censor: "[REDACTED]",
                paths: [
                  "req.headers.authorization",
                  "req.headers.cookie",
                  "req.body",
                  "res.headers.set-cookie"
                ]
              }
            },
      requestIdHeader: false,
      trustProxy: config.trustProxy
    }),
    { logger: false }
  );

  await application.register(helmet, {
    contentSecurityPolicy: false
  });
  await application.register(rateLimit, {
    allowList: (request) => request.url.startsWith("/health"),
    max: config.rateLimit.max,
    timeWindow: config.rateLimit.windowMs
  });

  const metrics = application.get(MetricsService);
  const requestStartTimes = new WeakMap<object, bigint>();
  const fastify = application.getHttpAdapter().getInstance();
  fastify.addHook("onRequest", async (request) => {
    requestStartTimes.set(request, process.hrtime.bigint());
  });
  fastify.addHook("onResponse", async (request, response) => {
    const startedAt = requestStartTimes.get(request);
    if (startedAt === undefined) {
      return;
    }
    try {
      metrics.observeHttpRequest({
        durationSeconds:
          Number(process.hrtime.bigint() - startedAt) / 1_000_000_000,
        method: request.method,
        route: request.routeOptions?.url ?? "unmatched",
        status: response.statusCode
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      process.stderr.write(
        `${JSON.stringify({
          event: "http_metrics_observation_failed",
          level: "error",
          message
        })}\n`
      );
    }
  });

  application.enableCors({
    allowedHeaders: [
      "Content-Type",
      "X-Idempotency-Key",
      "X-Request-Id"
    ],
    credentials: true,
    exposedHeaders: ["X-Request-Id"],
    maxAge: 600,
    methods: ["POST", "OPTIONS"],
    origin: [...config.corsOrigins]
  });

  return application;
}
