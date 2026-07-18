import type {
  ClaimedOutboxMessage,
  OutboxEvent,
  OutboxMaintenanceStore,
  OutboxStats,
  OutboxStore,
  OutboxWriter,
  SqlExecutor,
  TransactionRunner
} from "@product-foundation/backend-core";
import {
  assertDurableJsonValue,
  deserializeOperationScope,
  serializeOperationScope
} from "@product-foundation/backend-core";

interface OutboxRow {
  readonly aggregate_id: string;
  readonly aggregate_type: string;
  readonly attempt_count: number;
  readonly claim_token: string;
  readonly event_type: string;
  readonly id: string;
  readonly occurred_at: Date;
  readonly payload: unknown;
  readonly schema_version: number;
  readonly scope_id: string;
}

interface OutboxStatsRow {
  readonly dead_letter_count: string;
  readonly oldest_pending_at: Date | null;
  readonly pending_count: string;
}

function mapMessage(row: OutboxRow): ClaimedOutboxMessage {
  return {
    aggregateId: row.aggregate_id,
    aggregateType: row.aggregate_type,
    attemptCount: row.attempt_count,
    claimToken: row.claim_token,
    eventType: row.event_type,
    id: row.id,
    occurredAt: row.occurred_at,
    payload: row.payload,
    schemaVersion: row.schema_version,
    scope: deserializeOperationScope(row.scope_id)
  };
}

export class PostgresOutboxStore implements OutboxStore, OutboxWriter, OutboxMaintenanceStore {
  constructor(
    private readonly sql: SqlExecutor,
    private readonly transactions: TransactionRunner
  ) {}

  async append(transaction: SqlExecutor, event: OutboxEvent) {
    assertDurableJsonValue(event.payload, `Outbox payload for ${event.eventType}`);
    await transaction.query(
      `INSERT INTO platform.outbox_messages (
        id, scope_id, aggregate_type, aggregate_id, event_type,
        schema_version, payload, occurred_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        event.id,
        serializeOperationScope(event.scope),
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
            AND (locked_until IS NULL OR locked_until <= now())
          ORDER BY available_at, occurred_at
          FOR UPDATE SKIP LOCKED
          LIMIT $1
        )
        UPDATE platform.outbox_messages AS message
        SET locked_at = now(),
            locked_by = $3,
            locked_until = now() + ($2 * interval '1 millisecond'),
            claim_token = gen_random_uuid(),
            attempt_count = message.attempt_count + 1
        FROM candidates
        WHERE message.id = candidates.id
        RETURNING message.*`,
        [options.batchSize, options.leaseMs, options.workerId]
      );
      return result.rows.map(mapMessage);
    });
  }

  async complete(messageId: string, claimToken: string, workerId: string) {
    const result = await this.sql.query(
      `UPDATE platform.outbox_messages
       SET processed_at = now(), locked_at = NULL, locked_by = NULL,
           locked_until = NULL, claim_token = NULL, last_error = NULL
       WHERE id = $1 AND claim_token = $2 AND locked_by = $3
         AND locked_until > now() AND processed_at IS NULL AND dead_lettered_at IS NULL`,
      [messageId, claimToken, workerId]
    );
    if (result.rowCount !== 1) {
      throw new Error("Outbox completion lost ownership of the message.");
    }
  }

  async fail(options: {
    readonly deadLetter: boolean;
    readonly claimToken: string;
    readonly error: string;
    readonly messageId: string;
    readonly retryDelayMs: number;
    readonly workerId: string;
  }) {
    const result = await this.sql.query(
      `UPDATE platform.outbox_messages
       SET available_at = now() + ($4 * interval '1 millisecond'),
           dead_lettered_at = CASE WHEN $5 THEN now() ELSE NULL END,
           last_error = $6,
           locked_at = NULL,
           locked_by = NULL,
           locked_until = NULL,
           claim_token = NULL
       WHERE id = $1 AND claim_token = $2 AND locked_by = $3
         AND locked_until > now() AND processed_at IS NULL AND dead_lettered_at IS NULL`,
      [
        options.messageId,
        options.claimToken,
        options.workerId,
        options.retryDelayMs,
        options.deadLetter,
        options.error
      ]
    );
    if (result.rowCount !== 1) {
      throw new Error("Outbox failure handling lost ownership of the message.");
    }
  }

  async inspect(): Promise<OutboxStats> {
    const result = await this.sql.query<OutboxStatsRow>(
      `SELECT
         count(*) FILTER (
           WHERE processed_at IS NULL AND dead_lettered_at IS NULL
         )::text AS pending_count,
         count(*) FILTER (WHERE dead_lettered_at IS NOT NULL)::text
           AS dead_letter_count,
         min(occurred_at) FILTER (
           WHERE processed_at IS NULL AND dead_lettered_at IS NULL
         ) AS oldest_pending_at
       FROM platform.outbox_messages`
    );
    const row = result.rows[0];
    if (row === undefined) {
      throw new Error("Outbox statistics query returned no row.");
    }
    return {
      deadLetterCount: Number(row.dead_letter_count),
      oldestPendingAt: row.oldest_pending_at,
      pendingCount: Number(row.pending_count)
    };
  }

  async purgeFinalized(options: {
    readonly batchSize: number;
    readonly deadLetteredBefore: Date;
    readonly processedBefore: Date;
  }) {
    const result = await this.sql.query(
      `WITH candidates AS (
         SELECT id
         FROM platform.outbox_messages
         WHERE processed_at < $1 OR dead_lettered_at < $2
         ORDER BY COALESCE(processed_at, dead_lettered_at)
         LIMIT $3
       )
       DELETE FROM platform.outbox_messages AS message
       USING candidates
       WHERE message.id = candidates.id`,
      [options.processedBefore, options.deadLetteredBefore, options.batchSize]
    );
    return result.rowCount ?? 0;
  }

  async requeueDeadLetter(messageId: string) {
    const result = await this.sql.query(
      `UPDATE platform.outbox_messages
       SET available_at = now(), attempt_count = 0, dead_lettered_at = NULL,
           last_error = NULL, locked_at = NULL, locked_by = NULL,
           locked_until = NULL, claim_token = NULL
       WHERE id = $1 AND processed_at IS NULL AND dead_lettered_at IS NOT NULL`,
      [messageId]
    );
    return result.rowCount === 1;
  }
}
