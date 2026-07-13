import { hostname } from "node:os";
import { loadWorkerConfig } from "./app/config/load-worker-config.js";
import { createOutboxHandlers } from "./app/worker/create-outbox-handlers.js";
import { OutboxWorker } from "@product-foundation/backend-core";
import {
  PostgresDatabase,
  PostgresOutboxStore
} from "@product-foundation/backend-postgres";

function writeLog(entry: Readonly<Record<string, unknown>>) {
  process.stdout.write(`${JSON.stringify(entry)}\n`);
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
  const database = new PostgresDatabase({
    connectionTimeoutMs: config.database.connectionTimeoutMs,
    maxConnections: config.database.maxConnections,
    onUnexpectedPoolError: (error) => {
      writeLog({
        event: "postgres_pool_error",
        level: "error",
        message: error.message,
        runtime: "worker"
      });
    },
    url: config.database.url
  });
  const store = new PostgresOutboxStore(database, database);
  const workerId = `${hostname()}:${process.pid}:${crypto.randomUUID()}`;
  const worker = new OutboxWorker(store, createOutboxHandlers(), {
    batchSize: config.batchSize,
    leaseMs: config.leaseMs,
    maxAttempts: config.maxAttempts,
    workerId
  }, writeLog);
  const shutdown = new AbortController();
  const stop = () => shutdown.abort();
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);

  writeLog({ event: "worker_started", level: "info", workerId });
  try {
    while (!shutdown.signal.aborted) {
      const claimed = await worker.runOnce(shutdown.signal);
      if (claimed === 0) {
        await wait(config.pollIntervalMs, shutdown.signal);
      }
    }
  } finally {
    await database.close();
    writeLog({ event: "worker_stopped", level: "info", workerId });
  }
}

bootstrap().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  process.stderr.write(
    `${JSON.stringify({ event: "worker_start_failed", level: "fatal", message })}\n`
  );
  process.exitCode = 1;
});
