import type { SqlExecutor } from "../ports/database.js";
import type { WorkspaceScope } from "../security/request-context.js";

export interface OutboxEvent {
  readonly aggregateId: string;
  readonly aggregateType: string;
  readonly eventType: string;
  readonly id: string;
  readonly occurredAt: Date;
  readonly payload: unknown;
  readonly schemaVersion: number;
  readonly workspace: WorkspaceScope;
}

export interface ClaimedOutboxMessage extends OutboxEvent {
  readonly attemptCount: number;
}

export interface OutboxWriter {
  append(transaction: SqlExecutor, event: OutboxEvent): Promise<void>;
}

export interface OutboxStore {
  claim(options: {
    readonly batchSize: number;
    readonly leaseMs: number;
    readonly workerId: string;
  }): Promise<readonly ClaimedOutboxMessage[]>;

  complete(messageId: string, workerId: string): Promise<void>;

  fail(options: {
    readonly deadLetter: boolean;
    readonly error: string;
    readonly messageId: string;
    readonly retryDelayMs: number;
    readonly workerId: string;
  }): Promise<void>;
}

export interface OutboxMessageHandler {
  handle(
    message: ClaimedOutboxMessage,
    context: {
      readonly idempotencyKey: string;
      readonly signal?: AbortSignal;
    }
  ): Promise<void>;
}
