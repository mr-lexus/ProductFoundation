import { z } from "zod";

const DEFAULT_CORS_ORIGINS = ["http://127.0.0.1:1420", "http://localhost:1420"] as const;

const runtimeEnvironmentSchema = z.enum(["development", "test", "production"]);

const positiveIntegerSchema = z.coerce.number().int().positive();
const portSchema = positiveIntegerSchema.max(65_535);
const booleanStringSchema = z.enum(["true", "false"]).transform((value) => value === "true");
const logLevelSchema = z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]);
const migrationNamespaceSchema = z.string().regex(/^[a-z0-9][a-z0-9_-]{0,62}$/);

const environmentSchema = z
  .object({
    CORS_ORIGINS: z.string().optional(),
    DATA_SCOPE_MODE: z.enum(["global", "tenant"]).default("global"),
    DATABASE_CONNECTION_TIMEOUT_MS: positiveIntegerSchema.default(5_000),
    DATABASE_POOL_MAX: positiveIntegerSchema.default(10),
    DATABASE_URL: z.string().url().optional(),
    LOG_LEVEL: logLevelSchema.default("info"),
    MAX_RPC_BODY_BYTES: positiveIntegerSchema.default(1_048_576),
    MIGRATION_DATABASE_URL: z.string().url().optional(),
    NODE_ENV: runtimeEnvironmentSchema.default("development"),
    PORT: portSchema.default(3_001),
    PRODUCT_MIGRATION_NAMESPACE: migrationNamespaceSchema.default("app"),
    RATE_LIMIT_MAX: positiveIntegerSchema.default(300),
    RATE_LIMIT_WINDOW_MS: positiveIntegerSchema.default(60_000),
    TRUST_PROXY: booleanStringSchema.default("false"),
    WORKER_BATCH_SIZE: positiveIntegerSchema.max(50).default(10),
    WORKER_CLEANUP_BATCH_SIZE: positiveIntegerSchema.default(500),
    WORKER_DEAD_LETTER_RETENTION_MS: positiveIntegerSchema.default(2_592_000_000),
    WORKER_LEASE_MS: positiveIntegerSchema.default(30_000),
    WORKER_MAINTENANCE_INTERVAL_MS: positiveIntegerSchema.default(30_000),
    WORKER_MAX_ATTEMPTS: positiveIntegerSchema.default(10),
    WORKER_METRICS_PORT: portSchema.default(9_464),
    WORKER_PROCESSED_RETENTION_MS: positiveIntegerSchema.default(604_800_000),
    WORKER_POLL_INTERVAL_MS: positiveIntegerSchema.default(1_000)
  })
  .superRefine((value, context) => {
    for (const name of ["DATABASE_URL", "MIGRATION_DATABASE_URL"] as const) {
      const url = value[name];
      if (url !== undefined && !url.startsWith("postgresql://") && !url.startsWith("postgres://")) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${name} must use the postgres or postgresql protocol.`,
          path: [name]
        });
      }
    }
  });

export interface DatabaseRuntimeConfig {
  readonly connectionTimeoutMs: number;
  readonly maxConnections: number;
  readonly url: string;
}

export interface ApiRuntimeConfig {
  readonly corsOrigins: readonly string[];
  readonly dataScopeMode: "global" | "tenant";
  readonly database?: DatabaseRuntimeConfig;
  readonly environment: z.infer<typeof runtimeEnvironmentSchema>;
  readonly logLevel: z.infer<typeof logLevelSchema>;
  readonly maxRpcBodyBytes: number;
  readonly migrationNamespace: string;
  readonly port: number;
  readonly rateLimit: {
    readonly max: number;
    readonly windowMs: number;
  };
  readonly trustProxy: boolean;
}

export function parseRuntimeEnvironment(environment: NodeJS.ProcessEnv = process.env) {
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

export function migrationDatabaseConfigFromParsedEnvironment(
  parsed: ReturnType<typeof parseRuntimeEnvironment>
): DatabaseRuntimeConfig | undefined {
  const url = parsed.MIGRATION_DATABASE_URL ?? parsed.DATABASE_URL;
  return url === undefined
    ? undefined
    : {
        connectionTimeoutMs: parsed.DATABASE_CONNECTION_TIMEOUT_MS,
        maxConnections: 1,
        url
      };
}

function parseCorsOrigins(
  rawOrigins: string | undefined,
  environment: z.infer<typeof runtimeEnvironmentSchema>
) {
  const origins = rawOrigins
    ?.split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  if (origins === undefined || origins.length === 0) {
    if (environment === "production") {
      throw new Error("CORS_ORIGINS must contain at least one explicit production origin.");
    }
    return DEFAULT_CORS_ORIGINS;
  }

  return [
    ...new Set(
      origins.map((origin) => {
        if (origin === "*") {
          throw new Error("CORS_ORIGINS cannot use a wildcard with credentialed requests.");
        }
        const url = new URL(origin);
        if (url.protocol !== "http:" && url.protocol !== "https:") {
          throw new Error("CORS_ORIGINS entries must use http or https.");
        }
        if (url.origin !== origin || url.username !== "" || url.password !== "") {
          throw new Error("CORS_ORIGINS entries must be origins without credentials or paths.");
        }
        return url.origin;
      })
    )
  ];
}

export function loadApiConfig(environment: NodeJS.ProcessEnv = process.env): ApiRuntimeConfig {
  const parsed = parseRuntimeEnvironment(environment);
  const database = databaseConfigFromParsedEnvironment(parsed);

  if (parsed.NODE_ENV === "production" && database === undefined) {
    throw new Error("DATABASE_URL is required in production.");
  }
  const corsOrigins = parseCorsOrigins(parsed.CORS_ORIGINS, parsed.NODE_ENV);

  return {
    corsOrigins,
    dataScopeMode: parsed.DATA_SCOPE_MODE,
    ...(database === undefined ? {} : { database }),
    environment: parsed.NODE_ENV,
    logLevel: parsed.LOG_LEVEL,
    maxRpcBodyBytes: parsed.MAX_RPC_BODY_BYTES,
    migrationNamespace: parsed.PRODUCT_MIGRATION_NAMESPACE,
    port: parsed.PORT,
    rateLimit: {
      max: parsed.RATE_LIMIT_MAX,
      windowMs: parsed.RATE_LIMIT_WINDOW_MS
    },
    trustProxy: parsed.TRUST_PROXY
  };
}
