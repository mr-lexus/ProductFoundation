import { Injectable } from "@nestjs/common";
import {
  Gauge,
  Histogram,
  Registry
} from "prom-client";

@Injectable()
export class MetricsService {
  readonly #heapUsed: Gauge;
  readonly #httpDuration: Histogram<"method" | "route" | "status">;
  readonly #residentMemory: Gauge;
  readonly #registry = new Registry();
  readonly #uptime: Gauge;

  constructor() {
    this.#registry.setDefaultLabels({ service: "app_api" });
    this.#uptime = new Gauge({
      help: "Process uptime in seconds.",
      name: "app_process_uptime_seconds",
      registers: [this.#registry]
    });
    this.#residentMemory = new Gauge({
      help: "Resident memory size in bytes.",
      name: "app_process_resident_memory_bytes",
      registers: [this.#registry]
    });
    this.#heapUsed = new Gauge({
      help: "Used JavaScript heap in bytes.",
      name: "app_process_heap_used_bytes",
      registers: [this.#registry]
    });
    this.#httpDuration = new Histogram({
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
      help: "HTTP request duration in seconds.",
      labelNames: ["method", "route", "status"],
      name: "app_http_request_duration_seconds",
      registers: [this.#registry]
    });
  }

  contentType() {
    return this.#registry.contentType;
  }

  observeHttpRequest(input: {
    readonly durationSeconds: number;
    readonly method: string;
    readonly route: string;
    readonly status: number;
  }) {
    this.#httpDuration.observe(
      {
        method: input.method,
        route: input.route,
        status: String(input.status)
      },
      input.durationSeconds
    );
  }

  render() {
    const memory = process.memoryUsage();
    this.#uptime.set(process.uptime());
    this.#residentMemory.set(memory.rss);
    this.#heapUsed.set(memory.heapUsed);
    return this.#registry.metrics();
  }
}
