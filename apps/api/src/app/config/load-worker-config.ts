import { databaseConfigFromParsedEnvironment, parseRuntimeEnvironment } from "./load-api-config.js";

export interface WorkerRuntimeConfig {
  readonly batchSize: number;
  readonly cleanupBatchSize: number;
  readonly database: NonNullable<ReturnType<typeof databaseConfigFromParsedEnvironment>>;
  readonly leaseMs: number;
  readonly deadLetterRetentionMs: number;
  readonly maintenanceIntervalMs: number;
  readonly maxAttempts: number;
  readonly metricsPort: number;
  readonly pollIntervalMs: number;
  readonly processedRetentionMs: number;
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
    cleanupBatchSize: parsed.WORKER_CLEANUP_BATCH_SIZE,
    database,
    deadLetterRetentionMs: parsed.WORKER_DEAD_LETTER_RETENTION_MS,
    leaseMs: parsed.WORKER_LEASE_MS,
    maintenanceIntervalMs: parsed.WORKER_MAINTENANCE_INTERVAL_MS,
    maxAttempts: parsed.WORKER_MAX_ATTEMPTS,
    metricsPort: parsed.WORKER_METRICS_PORT,
    pollIntervalMs: parsed.WORKER_POLL_INTERVAL_MS,
    processedRetentionMs: parsed.WORKER_PROCESSED_RETENTION_MS
  };
}
