import {
  databaseConfigFromParsedEnvironment,
  parseRuntimeEnvironment
} from "./load-api-config.js";

export interface WorkerRuntimeConfig {
  readonly batchSize: number;
  readonly database: NonNullable<
    ReturnType<typeof databaseConfigFromParsedEnvironment>
  >;
  readonly leaseMs: number;
  readonly maxAttempts: number;
  readonly pollIntervalMs: number;
}

export function loadWorkerConfig(
  environment: NodeJS.ProcessEnv = process.env
): WorkerRuntimeConfig {
  const parsed = parseRuntimeEnvironment(environment);
  const database = databaseConfigFromParsedEnvironment(parsed);

  if (database === undefined) {
    throw new Error("DATABASE_URL is required to run the worker.");
  }

  return {
    batchSize: parsed.WORKER_BATCH_SIZE,
    database,
    leaseMs: parsed.WORKER_LEASE_MS,
    maxAttempts: parsed.WORKER_MAX_ATTEMPTS,
    pollIntervalMs: parsed.WORKER_POLL_INTERVAL_MS
  };
}
