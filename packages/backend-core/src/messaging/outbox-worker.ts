import type { ClaimedOutboxMessage, OutboxMessageHandler, OutboxStore } from "./outbox.js";

export interface OutboxWorkerOptions {
  readonly batchSize: number;
  readonly leaseMs: number;
  readonly maxAttempts: number;
  readonly workerId: string;
}

export type OutboxWorkerLog = (entry: Readonly<Record<string, unknown>>) => void;

export interface OutboxWorkerObserver {
  batchClaimed(count: number): void;
  deliveryCompleted(eventType: string): void;
  deliveryFailed(eventType: string, deadLetter: boolean): void;
}

const noOpObserver: OutboxWorkerObserver = {
  batchClaimed() {},
  deliveryCompleted() {},
  deliveryFailed() {}
};

function errorName(error: unknown) {
  return error instanceof Error ? error.name.slice(0, 200) : "UnknownError";
}

function retryDelay(attemptCount: number) {
  const exponent = Math.max(0, Math.min(attemptCount - 1, 10));
  return Math.min(60_000, 250 * 2 ** exponent);
}

export class OutboxWorker {
  constructor(
    private readonly store: OutboxStore,
    private readonly handlers: ReadonlyMap<string, OutboxMessageHandler>,
    private readonly options: OutboxWorkerOptions,
    private readonly log: OutboxWorkerLog,
    private readonly observer: OutboxWorkerObserver = noOpObserver
  ) {}

  async runOnce(signal?: AbortSignal) {
    const messages = await this.store.claim({
      batchSize: this.options.batchSize,
      leaseMs: this.options.leaseMs,
      workerId: this.options.workerId
    });
    this.observer.batchClaimed(messages.length);

    for (const message of messages) {
      if (signal?.aborted === true) {
        break;
      }
      await this.#deliver(message, signal);
    }

    return messages.length;
  }

  async #deliver(message: ClaimedOutboxMessage, signal?: AbortSignal) {
    const handler = this.handlers.get(message.eventType);

    try {
      if (handler === undefined) {
        throw new Error(`No handler registered for ${message.eventType}.`);
      }
      await handler.handle(message, {
        idempotencyKey: message.id,
        ...(signal === undefined ? {} : { signal })
      });
      await this.store.complete(message.id, this.options.workerId);
      this.observer.deliveryCompleted(message.eventType);
    } catch (error) {
      const deadLetter = message.attemptCount >= this.options.maxAttempts;
      await this.store.fail({
        deadLetter,
        error: errorName(error),
        messageId: message.id,
        retryDelayMs: retryDelay(message.attemptCount),
        workerId: this.options.workerId
      });
      this.observer.deliveryFailed(message.eventType, deadLetter);
      this.log({
        deadLetter,
        event: "outbox_delivery_failed",
        eventType: message.eventType,
        level: deadLetter ? "error" : "warn",
        messageId: message.id
      });
    }
  }
}
