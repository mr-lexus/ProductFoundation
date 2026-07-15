import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { OutboxStats, OutboxWorkerObserver } from "@product-foundation/backend-core";
import { Counter, collectDefaultMetrics, Gauge, Registry } from "prom-client";

export class WorkerObservability {
  readonly #claimed = new Counter({
    help: "Outbox messages claimed by this worker process.",
    name: "app_worker_outbox_claimed_total",
    registers: []
  });
  readonly #cleaned = new Counter({
    help: "Finalized outbox messages removed by retention cleanup.",
    name: "app_worker_outbox_cleaned_total",
    registers: []
  });
  readonly #completed = new Counter<"event_type">({
    help: "Outbox messages delivered successfully.",
    labelNames: ["event_type"],
    name: "app_worker_outbox_completed_total",
    registers: []
  });
  readonly #deadLetters = new Gauge({
    help: "Current number of dead-lettered outbox messages.",
    name: "app_worker_outbox_dead_letters",
    registers: []
  });
  readonly #failed = new Counter<"dead_letter" | "event_type">({
    help: "Outbox message delivery failures.",
    labelNames: ["event_type", "dead_letter"],
    name: "app_worker_outbox_failed_total",
    registers: []
  });
  readonly #oldestPendingAge = new Gauge({
    help: "Age in seconds of the oldest pending outbox message.",
    name: "app_worker_outbox_oldest_pending_age_seconds",
    registers: []
  });
  readonly #pending = new Gauge({
    help: "Current number of pending outbox messages.",
    name: "app_worker_outbox_pending",
    registers: []
  });
  readonly #pollFailures = new Counter({
    help: "Worker polling or maintenance failures.",
    name: "app_worker_poll_failures_total",
    registers: []
  });
  readonly #ready = new Gauge({
    help: "Whether the worker can currently access its durable store.",
    name: "app_worker_ready",
    registers: []
  });
  readonly #registry = new Registry();
  #isReady = false;
  #server: Server | undefined;

  constructor() {
    this.#registry.setDefaultLabels({ service: "app_worker" });
    this.#registry.registerMetric(this.#claimed);
    this.#registry.registerMetric(this.#cleaned);
    this.#registry.registerMetric(this.#completed);
    this.#registry.registerMetric(this.#deadLetters);
    this.#registry.registerMetric(this.#failed);
    this.#registry.registerMetric(this.#oldestPendingAge);
    this.#registry.registerMetric(this.#pending);
    this.#registry.registerMetric(this.#pollFailures);
    this.#registry.registerMetric(this.#ready);
    collectDefaultMetrics({ prefix: "app_worker_process_", register: this.#registry });
    this.#ready.set(0);
  }

  observer(): OutboxWorkerObserver {
    return {
      batchClaimed: (count) => this.#claimed.inc(count),
      deliveryCompleted: (eventType) => this.#completed.inc({ event_type: eventType }),
      deliveryFailed: (eventType, deadLetter) =>
        this.#failed.inc({
          dead_letter: String(deadLetter),
          event_type: eventType
        })
    };
  }

  recordCleanup(count: number) {
    this.#cleaned.inc(count);
  }

  recordPollFailure() {
    this.#pollFailures.inc();
  }

  setReady(ready: boolean) {
    this.#isReady = ready;
    this.#ready.set(ready ? 1 : 0);
  }

  updateOutboxStats(stats: OutboxStats, now = new Date()) {
    this.#deadLetters.set(stats.deadLetterCount);
    this.#pending.set(stats.pendingCount);
    this.#oldestPendingAge.set(
      stats.oldestPendingAt === null
        ? 0
        : Math.max(0, (now.getTime() - stats.oldestPendingAt.getTime()) / 1_000)
    );
  }

  async #handleRequest(request: IncomingMessage, response: ServerResponse) {
    const path = new URL(request.url ?? "/", "http://worker.local").pathname;
    if (path === "/health/live") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end('{"service":"worker","status":"ok"}');
      return;
    }
    if (path === "/health/ready") {
      const ready = this.#isReady;
      response.writeHead(ready ? 200 : 503, {
        "content-type": "application/json"
      });
      response.end(
        JSON.stringify({
          service: "worker",
          status: ready ? "ready" : "unavailable"
        })
      );
      return;
    }
    if (path === "/metrics") {
      const metrics = await this.#registry.metrics();
      response.writeHead(200, { "content-type": this.#registry.contentType });
      response.end(metrics);
      return;
    }
    response.writeHead(404, { "content-type": "application/json" });
    response.end('{"status":"not_found"}');
  }

  async start(port: number) {
    if (this.#server !== undefined) {
      throw new Error("Worker observability server is already running.");
    }
    const server = createServer((request, response) => {
      void this.#handleRequest(request, response).catch((error: unknown) => {
        process.stderr.write(
          `${JSON.stringify({
            errorName: error instanceof Error ? error.name : "UnknownError",
            event: "worker_observability_request_failed",
            level: "error"
          })}\n`
        );
        if (response.headersSent) {
          response.destroy();
          return;
        }
        response.writeHead(500, { "content-type": "application/json" });
        response.end('{"status":"error"}');
      });
    });
    this.#server = server;
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(port, "0.0.0.0", () => {
        server.off("error", reject);
        resolve();
      });
    });
  }

  async stop() {
    const server = this.#server;
    this.#server = undefined;
    if (server === undefined || !server.listening) {
      return;
    }
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error === undefined ? resolve() : reject(error)));
    });
  }
}
