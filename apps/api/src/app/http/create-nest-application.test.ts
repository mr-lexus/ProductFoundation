import assert from "node:assert/strict";
import test from "node:test";
import {
  createRpcSuccessResponseSchema,
  rpcErrorResponseSchema,
  systemPingRpcContract
} from "@app/contracts";
import type { FastifyInstance, InjectOptions } from "fastify";
import { type ApiRuntimeConfig, loadApiConfig } from "../config/load-api-config.js";
import { loadMigrationConfig } from "../config/load-migration-config.js";
import { createNestApplication } from "../create-nest-application.js";

type TestConfigOverrides = Partial<Pick<ApiRuntimeConfig, "corsOrigins" | "maxRpcBodyBytes">>;

async function inject(options: InjectOptions, overrides: TestConfigOverrides = {}) {
  const config = {
    ...loadApiConfig({ NODE_ENV: "test" }),
    ...overrides
  };
  const application = await createNestApplication(config, {
    logger: false
  });
  await application.init();

  try {
    const fastify = application.getHttpAdapter().getInstance() as FastifyInstance;

    return await fastify.inject(options);
  } finally {
    await application.close();
  }
}

test("NestJS RPC success uses the versioned contract envelope", async () => {
  const response = await inject({
    headers: {
      "content-type": "application/json",
      "x-request-id": "test-request-1"
    },
    method: "POST",
    payload: { platform: "web" },
    url: systemPingRpcContract.path
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.headers["x-request-id"], "test-request-1");
  assert.equal(response.headers["x-content-type-options"], "nosniff");

  const schema = createRpcSuccessResponseSchema(systemPingRpcContract.outputSchema);
  const payload = schema.parse(response.json());

  assert.equal(payload.data.platform, "web");
  assert.equal(payload.data.status, "ready");
  assert.equal(payload.meta.requestId, "test-request-1");
});

test("NestJS RPC validation failures use the typed error envelope", async () => {
  const response = await inject({
    headers: { "content-type": "application/json" },
    method: "POST",
    payload: { platform: "unknown" },
    url: systemPingRpcContract.path
  });

  assert.equal(response.statusCode, 400);
  const payload = rpcErrorResponseSchema.parse(response.json());

  assert.equal(payload.error.code, "BAD_REQUEST");
  assert.equal(payload.error.retryable, false);
});

test("NestJS uses one generated request ID when the incoming ID is invalid", async () => {
  const response = await inject({
    headers: {
      "content-type": "application/json",
      "x-request-id": "invalid request id"
    },
    method: "POST",
    payload: { platform: "web" },
    url: systemPingRpcContract.path
  });
  const payload = createRpcSuccessResponseSchema(systemPingRpcContract.outputSchema).parse(
    response.json()
  );

  assert.equal(response.statusCode, 200);
  assert.equal(response.headers["x-request-id"], payload.meta.requestId);
  assert.notEqual(payload.meta.requestId, "invalid request id");
});

test("NestJS permits authorization headers in CORS preflight", async () => {
  const response = await inject({
    headers: {
      "access-control-request-headers": "authorization,content-type",
      "access-control-request-method": "POST",
      origin: "http://localhost:1420"
    },
    method: "OPTIONS",
    url: systemPingRpcContract.path
  });

  assert.equal(response.statusCode, 204);
  assert.match(response.headers["access-control-allow-headers"] ?? "", /Authorization/i);
});

test("NestJS maps Fastify parser errors to the RPC envelope", async () => {
  const unsupportedResponse = await inject({
    headers: { "content-type": "application/x-www-form-urlencoded" },
    method: "POST",
    payload: "platform=web",
    url: systemPingRpcContract.path
  });
  assert.equal(unsupportedResponse.statusCode, 415);
  assert.equal(
    rpcErrorResponseSchema.parse(unsupportedResponse.json()).error.code,
    "UNSUPPORTED_MEDIA_TYPE"
  );

  const oversizedResponse = await inject(
    {
      headers: { "content-type": "application/json" },
      method: "POST",
      payload: { padding: "x".repeat(64), platform: "web" },
      url: systemPingRpcContract.path
    },
    { maxRpcBodyBytes: 16 }
  );
  assert.equal(oversizedResponse.statusCode, 413);
  assert.equal(
    rpcErrorResponseSchema.parse(oversizedResponse.json()).error.code,
    "PAYLOAD_TOO_LARGE"
  );
});

test("NestJS RPC validates the idempotency key header", async () => {
  const response = await inject({
    headers: {
      "content-type": "application/json",
      "x-idempotency-key": "spaces are not allowed"
    },
    method: "POST",
    payload: { platform: "web" },
    url: systemPingRpcContract.path
  });

  assert.equal(response.statusCode, 400);
  const payload = rpcErrorResponseSchema.parse(response.json());
  assert.equal(payload.error.code, "BAD_REQUEST");
});

test("NestJS exposes liveness and readiness probes", async () => {
  const live = await inject({
    method: "GET",
    url: "/health/live"
  });
  const ready = await inject({
    method: "GET",
    url: "/health/ready"
  });

  assert.equal(live.statusCode, 200);
  assert.equal(live.json().status, "ok");
  assert.equal(ready.statusCode, 200);
  assert.equal(ready.json().status, "ready");
});

test("NestJS exposes Prometheus metrics without response bodies", async () => {
  const application = await createNestApplication(loadApiConfig({ NODE_ENV: "test" }), {
    logger: false
  });
  await application.init();
  const fastify = application.getHttpAdapter().getInstance() as FastifyInstance;

  await fastify.inject({ method: "GET", url: "/health/live" });
  const response = await fastify.inject({ method: "GET", url: "/metrics" });
  await application.close();

  assert.equal(response.statusCode, 200, response.body);
  assert.match(response.headers["content-type"] ?? "", /text\/plain/);
  assert.match(response.body, /app_http_request_duration_seconds/);
  assert.doesNotMatch(response.body, /platform.*web/);
});

test("NestJS boots a real Fastify listener", async () => {
  const application = await createNestApplication(loadApiConfig({ NODE_ENV: "test" }), {
    logger: false
  });

  await application.listen(0, "127.0.0.1");

  try {
    const baseUrl = await application.getUrl();
    const response = await fetch(`${baseUrl}/health/live`);

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      service: "api",
      status: "ok"
    });
  } finally {
    await application.close();
  }
});

test("API runtime config validates numeric values", () => {
  const config = loadApiConfig({
    CORS_ORIGINS: "https://app.example.com, https://desktop.example.com",
    MAX_RPC_BODY_BYTES: "2048",
    PORT: "4000"
  });

  assert.deepEqual(config.corsOrigins, ["https://app.example.com", "https://desktop.example.com"]);
  assert.equal(config.maxRpcBodyBytes, 2048);
  assert.equal(config.port, 4000);
  assert.throws(() => loadApiConfig({ PORT: "not-a-port" }));
  assert.throws(() => loadApiConfig({ PORT: "70000" }));
  assert.throws(() => loadApiConfig({ NODE_ENV: "production" }));
  assert.throws(() =>
    loadApiConfig({
      CORS_ORIGINS: "",
      DATABASE_URL: "postgresql://user:password@database:5432/app",
      NODE_ENV: "production"
    })
  );
  assert.throws(() =>
    loadApiConfig({
      CORS_ORIGINS: "*",
      DATABASE_URL: "postgresql://user:password@database:5432/app",
      NODE_ENV: "production"
    })
  );

  const production = loadApiConfig({
    CORS_ORIGINS: "https://app.example.com",
    DATABASE_URL: "postgresql://user:password@database:5432/app",
    NODE_ENV: "production"
  });
  assert.equal(production.database?.maxConnections, 10);

  const migration = loadMigrationConfig({
    DATABASE_URL: "postgresql://runtime:password@database:5432/app",
    MIGRATION_DATABASE_URL: "postgresql://owner:password@database:5432/app"
  });
  assert.match(migration.database.url, /owner/);
});
