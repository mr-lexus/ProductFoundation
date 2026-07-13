import { z } from "zod";

const DEFAULT_CORS_ORIGINS = [
  "http://127.0.0.1:1420",
  "http://localhost:1420"
] as const;

const runtimeEnvironmentSchema = z.enum([
  "development",
  "test",
  "production"
]);

const positiveIntegerSchema = z.coerce.number().int().positive();
const booleanStringSchema = z
  .enum(["true", "false"])
  .transform((value) => value === "true");
const logLevelSchema = z.enum([
  "fatal",
  "error",
  "warn",
  "info",
  "debug",
  "trace",
  "silent"
]);

const environmentSchema = z
  .object({
    CORS_ORIGINS: z.string().optional(),
    DATABASE_CONNECTION_TIMEOUT_MS: positiveIntegerSchema.default(5_000),
    DATABASE_POOL_MAX: positiveIntegerSchema.default(10),
    DATABASE_URL: z.string().url().optional(),
    LOG_LEVEL: logLevelSchema.default("info"),
    MAX_RPC_BODY_BYTES: positiveIntegerSchema.default(1_048_576),
    NODE_ENV: runtimeEnvironmentSchema.default("development"),
    PORT: positiveIntegerSchema.default(3_001),
    RATE_LIMIT_MAX: positiveIntegerSchema.default(300),
    RATE_LIMIT_WINDOW_MS: positiveIntegerSchema.default(60_000),
    TRUST_PROXY: booleanStringSchema.default("false"),
    WORKER_BATCH_SIZE: positiveIntegerSchema.default(50),
    WORKER_LEASE_MS: positiveIntegerSchema.default(30_000),
    WORKER_MAX_ATTEMPTS: positiveIntegerSchema.default(10),
    WORKER_POLL_INTERVAL_MS: positiveIntegerSchema.default(1_000)
  })
  .superRefine((value, context) => {
    if (
      value.DATABASE_URL !== undefined &&
      !value.DATABASE_URL.startsWith("postgresql://") &&
      !value.DATABASE_URL.startsWith("postgres://")
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "DATABASE_URL must use the postgres or postgresql protocol.",
        path: ["DATABASE_URL"]
      });
    }
  });

export interface DatabaseRuntimeConfig {
  readonly connectionTimeoutMs: number;
  readonly maxConnections: number;
  readonly url: string;
}

export interface ApiRuntimeConfig {
  readonly corsOrigins: readonly string[];
  readonly database?: DatabaseRuntimeConfig;
  readonly environment: z.infer<typeof runtimeEnvironmentSchema>;
  readonly logLevel: z.infer<typeof logLevelSchema>;
  readonly maxRpcBodyBytes: number;
  readonly port: number;
  readonly rateLimit: {
    readonly max: number;
    readonly windowMs: number;
  };
  readonly trustProxy: boolean;
}

export function parseRuntimeEnvironment(
  environment: NodeJS.ProcessEnv = process.env
) {
  return environmentSchema.parse(environment);
}

export function databaseConfigFromParsedEnvironment(
  parsed: ReturnType<typeof parseRuntimeEnvironment>
): DatabaseRuntimeConfig | undefined {
  return parsed.DATABASE_URL === undefined
    ? undefined
    : {
        connectionTimeoutMs: parsed.DATABASE_CONNECTION_TIMEOUT_MS,
        maxConnections: parsed.DATABASE_POOL_MAX,
        url: parsed.DATABASE_URL
      };
}

function parseCorsOrigins(rawOrigins: string | undefined) {
  const origins = rawOrigins
    ?.split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  return origins === undefined || origins.length === 0
    ? DEFAULT_CORS_ORIGINS
    : origins;
}

export function loadApiConfig(
  environment: NodeJS.ProcessEnv = process.env
): ApiRuntimeConfig {
  const parsed = parseRuntimeEnvironment(environment);
  const database = databaseConfigFromParsedEnvironment(parsed);

  if (parsed.NODE_ENV === "production" && database === undefined) {
    throw new Error("DATABASE_URL is required in production.");
  }
  if (parsed.NODE_ENV === "production" && parsed.CORS_ORIGINS === undefined) {
    throw new Error("CORS_ORIGINS is required in production.");
  }

  return {
    corsOrigins: parseCorsOrigins(parsed.CORS_ORIGINS),
    ...(database === undefined ? {} : { database }),
    environment: parsed.NODE_ENV,
    logLevel: parsed.LOG_LEVEL,
    maxRpcBodyBytes: parsed.MAX_RPC_BODY_BYTES,
    port: parsed.PORT,
    rateLimit: {
      max: parsed.RATE_LIMIT_MAX,
      windowMs: parsed.RATE_LIMIT_WINDOW_MS
    },
    trustProxy: parsed.TRUST_PROXY
  };
}
