import { hostname } from "node:os";
import { OutboxWorker } from "@product-foundation/backend-core";
import { PostgresDatabase, PostgresOutboxStore } from "@product-foundation/backend-postgres";
import { loadWorkerConfig } from "./app/config/load-worker-config.js";
import { createOutboxHandlers } from "./app/worker/create-outbox-handlers.js";
import { WorkerObservability } from "./app/worker/worker-observability.js";

function writeLog(entry: Readonly<Record<string, unknown>>) {
  process.stdout.write(`${JSON.stringify(entry)}\n`);
}

function safeErrorName(error: unknown) {
  return error instanceof Error ? error.name : "UnknownError";
}

function wait(milliseconds: number, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }

    const timer = setTimeout(resolve, milliseconds);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true }
    );
  });
}

async function bootstrap() {
  const config = loadWorkerConfig();
  const observability = new WorkerObservability();
  await observability.start(config.metricsPort);
  const database = new PostgresDatabase({
    connectionTimeoutMs: config.database.connectionTimeoutMs,
    maxConnections: config.database.maxConnections,
    onUnexpectedPoolError: (error) => {
      writeLog({
        errorName: error.name,
        event: "postgres_pool_error",
        level: "error",
        runtime: "worker"
      });
    },
    url: config.database.url
  });
  const store = new PostgresOutboxStore(database, database);
  const workerId = `${hostname()}:${process.pid}:${crypto.randomUUID()}`;
  const worker = new OutboxWorker(
    store,
    createOutboxHandlers(database),
    {
      batchSize: config.batchSize,
      leaseMs: config.leaseMs,
      maxAttempts: config.maxAttempts,
      workerId
    },
    writeLog,
    observability.observer()
  );
  const shutdown = new AbortController();
  const stop = () => shutdown.abort();
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  let nextMaintenanceAt = 0;

  writeLog({
    event: "worker_started",
    level: "info",
    metricsPort: config.metricsPort,
    workerId
  });
  try {
    while (!shutdown.signal.aborted) {
      try {
        const now = new Date();
        if (now.getTime() >= nextMaintenanceAt) {
          const purged = await store.purgeFinalized({
            batchSize: config.cleanupBatchSize,
            deadLetteredBefore: new Date(now.getTime() - config.deadLetterRetentionMs),
            processedBefore: new Date(now.getTime() - config.processedRetentionMs)
          });
          observability.recordCleanup(purged);
          observability.updateOutboxStats(await store.inspect(), now);
          nextMaintenanceAt = now.getTime() + config.maintenanceIntervalMs;
        }

        const claimed = await worker.runOnce(shutdown.signal);
        observability.setReady(true);
        if (claimed === 0) {
          await wait(config.pollIntervalMs, shutdown.signal);
        }
      } catch (error) {
        observability.recordPollFailure();
        observability.setReady(false);
        writeLog({
          errorName: safeErrorName(error),
          event: "worker_poll_failed",
          level: "error",
          workerId
        });
        await wait(config.pollIntervalMs, shutdown.signal);
      }
    }
  } finally {
    observability.setReady(false);
    await database.close();
    await observability.stop();
    writeLog({ event: "worker_stopped", level: "info", workerId });
  }
}

bootstrap().catch((error: unknown) => {
  process.stderr.write(
    `${JSON.stringify({
      errorName: safeErrorName(error),
      event: "worker_start_failed",
      level: "fatal"
    })}\n`
  );
  process.exitCode = 1;
});
