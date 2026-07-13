import type {
  SqlExecutor,
  TransactionRunner
} from "@product-foundation/backend-core";
import type {
  ClaimedOutboxMessage,
  OutboxEvent,
  OutboxStore,
  OutboxWriter
} from "@product-foundation/backend-core";
import { createWorkspaceId } from "@product-foundation/backend-core";

interface OutboxRow {
  readonly aggregate_id: string;
  readonly aggregate_type: string;
  readonly attempt_count: number;
  readonly event_type: string;
  readonly id: string;
  readonly occurred_at: Date;
  readonly payload: unknown;
  readonly schema_version: number;
  readonly scope_id: string;
}

function mapMessage(row: OutboxRow): ClaimedOutboxMessage {
  return {
    aggregateId: row.aggregate_id,
    aggregateType: row.aggregate_type,
    attemptCount: row.attempt_count,
    eventType: row.event_type,
    id: row.id,
    occurredAt: row.occurred_at,
    payload: row.payload,
    schemaVersion: row.schema_version,
    workspace: { workspaceId: createWorkspaceId(row.scope_id) }
  };
}

export class PostgresOutboxStore implements OutboxStore, OutboxWriter {
  constructor(
    private readonly sql: SqlExecutor,
    private readonly transactions: TransactionRunner
  ) {}

  async append(transaction: SqlExecutor, event: OutboxEvent) {
    await transaction.query(
      `INSERT INTO platform.outbox_messages (
        id, scope_id, aggregate_type, aggregate_id, event_type,
        schema_version, payload, occurred_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        event.id,
        event.workspace.workspaceId,
        event.aggregateType,
        event.aggregateId,
        event.eventType,
        event.schemaVersion,
        event.payload,
        event.occurredAt
      ]
    );
  }

  claim(options: {
    readonly batchSize: number;
    readonly leaseMs: number;
    readonly workerId: string;
  }) {
    return this.transactions.run(async (transaction) => {
      const result = await transaction.query<OutboxRow>(
        `WITH candidates AS (
          SELECT id
          FROM platform.outbox_messages
          WHERE processed_at IS NULL
            AND dead_lettered_at IS NULL
            AND available_at <= now()
            AND (locked_at IS NULL OR locked_at < now() - ($2 * interval '1 millisecond'))
          ORDER BY available_at, occurred_at
          FOR UPDATE SKIP LOCKED
          LIMIT $1
        )
        UPDATE platform.outbox_messages AS message
        SET locked_at = now(),
            locked_by = $3,
            attempt_count = message.attempt_count + 1
        FROM candidates
        WHERE message.id = candidates.id
        RETURNING message.*`,
        [options.batchSize, options.leaseMs, options.workerId]
      );
      return result.rows.map(mapMessage);
    });
  }

  async complete(messageId: string, workerId: string) {
    await this.sql.query(
      `UPDATE platform.outbox_messages
       SET processed_at = now(), locked_at = NULL, locked_by = NULL, last_error = NULL
       WHERE id = $1 AND locked_by = $2`,
      [messageId, workerId]
    );
  }

  async fail(options: {
    readonly deadLetter: boolean;
    readonly error: string;
    readonly messageId: string;
    readonly retryDelayMs: number;
    readonly workerId: string;
  }) {
    await this.sql.query(
      `UPDATE platform.outbox_messages
       SET available_at = now() + ($3 * interval '1 millisecond'),
           dead_lettered_at = CASE WHEN $4 THEN now() ELSE NULL END,
           last_error = $5,
           locked_at = NULL,
           locked_by = NULL
       WHERE id = $1 AND locked_by = $2`,
      [
        options.messageId,
        options.workerId,
        options.retryDelayMs,
        options.deadLetter,
        options.error
      ]
    );
  }
}
