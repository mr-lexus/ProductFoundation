import type { SqlExecutor } from "../ports/database.js";
import type { OperationScope } from "../security/request-context.js";

export interface OutboxEvent {
  readonly aggregateId: string;
  readonly aggregateType: string;
  readonly eventType: string;
  readonly id: string;
  readonly occurredAt: Date;
  readonly payload: unknown;
  readonly schemaVersion: number;
  readonly scope: OperationScope;
}

export interface ClaimedOutboxMessage extends OutboxEvent {
  readonly attemptCount: number;
  readonly claimToken: string;
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

  complete(messageId: string, claimToken: string, workerId: string): Promise<void>;

  fail(options: {
    readonly deadLetter: boolean;
    readonly claimToken: string;
    readonly error: string;
    readonly messageId: string;
    readonly retryDelayMs: number;
    readonly workerId: string;
  }): Promise<void>;
}

export interface OutboxStats {
  readonly deadLetterCount: number;
  readonly oldestPendingAt: Date | null;
  readonly pendingCount: number;
}

export interface OutboxMaintenanceStore {
  inspect(): Promise<OutboxStats>;

  purgeFinalized(options: {
    readonly batchSize: number;
    readonly deadLetteredBefore: Date;
    readonly processedBefore: Date;
  }): Promise<number>;

  requeueDeadLetter(messageId: string): Promise<boolean>;
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
