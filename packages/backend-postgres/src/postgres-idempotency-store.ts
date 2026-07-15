import type {
  IdempotencyClaim,
  IdempotencyKey,
  IdempotencyOwnership,
  IdempotencyStore,
  SqlExecutor,
  TransactionRunner
} from "@product-foundation/backend-core";
import { serializeOperationScope } from "@product-foundation/backend-core";

interface IdempotencyRow {
  readonly lock_active: boolean;
  readonly request_hash: string;
  readonly response_body: unknown;
  readonly response_status: number | null;
  readonly state: "processing" | "completed" | "failed";
}

function parameters(key: IdempotencyKey) {
  return [serializeOperationScope(key.scope), key.procedureId, key.key] as const;
}

export class PostgresIdempotencyStore implements IdempotencyStore {
  constructor(
    private readonly sql: SqlExecutor,
    private readonly transactions: TransactionRunner
  ) {}

  claim(
    key: IdempotencyKey,
    options: IdempotencyOwnership & {
      readonly leaseMs: number;
      readonly ttlMs: number;
    }
  ): Promise<IdempotencyClaim> {
    return this.transactions.run(async (transaction) => {
      await transaction.query(
        `WITH expired AS (
           SELECT scope_id, procedure_id, idempotency_key
           FROM platform.idempotency_records
           WHERE expires_at <= now()
             AND (state <> 'processing' OR locked_until <= now())
           ORDER BY expires_at
           LIMIT 100
         )
         DELETE FROM platform.idempotency_records AS record
         USING expired
         WHERE record.scope_id = expired.scope_id
           AND record.procedure_id = expired.procedure_id
           AND record.idempotency_key = expired.idempotency_key`
      );

      const inserted = await transaction.query(
        `INSERT INTO platform.idempotency_records (
          scope_id, procedure_id, idempotency_key, request_hash, state,
          locked_by, locked_until, expires_at
        ) VALUES (
          $1, $2, $3, $4, 'processing', $5,
          now() + ($6 * interval '1 millisecond'),
          now() + ($7 * interval '1 millisecond')
        ) ON CONFLICT DO NOTHING
        RETURNING idempotency_key`,
        [...parameters(key), key.requestHash, options.ownerId, options.leaseMs, options.ttlMs]
      );
      if (inserted.rowCount === 1) {
        return { kind: "acquired" };
      }

      const existing = await transaction.query<IdempotencyRow>(
        `SELECT request_hash, state, response_status, response_body,
                COALESCE(locked_until > now(), false) AS lock_active
         FROM platform.idempotency_records
         WHERE scope_id = $1 AND procedure_id = $2 AND idempotency_key = $3
         FOR UPDATE`,
        parameters(key)
      );
      const record = existing.rows[0];
      if (record === undefined) {
        throw new Error("Idempotency record disappeared while claiming it.");
      }
      if (record.request_hash !== key.requestHash) {
        return { kind: "conflict" };
      }
      if (record.state === "completed" && record.response_status !== null) {
        return {
          kind: "replay",
          responseBody: record.response_body,
          responseStatus: record.response_status
        };
      }
      if (record.state === "processing" && record.lock_active) {
        return { kind: "in_progress" };
      }

      await transaction.query(
        `UPDATE platform.idempotency_records
         SET state = 'processing', locked_by = $4,
             locked_until = now() + ($5 * interval '1 millisecond'),
             expires_at = now() + ($6 * interval '1 millisecond'),
             updated_at = now()
         WHERE scope_id = $1 AND procedure_id = $2 AND idempotency_key = $3`,
        [...parameters(key), options.ownerId, options.leaseMs, options.ttlMs]
      );
      return { kind: "acquired" };
    });
  }

  async complete(
    key: IdempotencyKey,
    ownership: IdempotencyOwnership,
    response: { readonly body: unknown; readonly status: number }
  ) {
    const result = await this.sql.query(
      `UPDATE platform.idempotency_records
       SET state = 'completed', response_status = $6, response_body = $7,
           locked_by = NULL, locked_until = NULL, updated_at = now()
       WHERE scope_id = $1 AND procedure_id = $2 AND idempotency_key = $3
         AND request_hash = $4 AND locked_by = $5 AND state = 'processing'`,
      [...parameters(key), key.requestHash, ownership.ownerId, response.status, response.body]
    );
    if (result.rowCount !== 1) {
      throw new Error("Idempotency completion lost ownership of the record.");
    }
  }

  async release(key: IdempotencyKey, ownership: IdempotencyOwnership) {
    const result = await this.sql.query(
      `UPDATE platform.idempotency_records
       SET state = 'failed', locked_by = NULL, locked_until = NULL, updated_at = now()
       WHERE scope_id = $1 AND procedure_id = $2 AND idempotency_key = $3
         AND request_hash = $4 AND locked_by = $5 AND state = 'processing'`,
      [...parameters(key), key.requestHash, ownership.ownerId]
    );
    if (result.rowCount !== 1) {
      throw new Error("Idempotency release lost ownership of the record.");
    }
  }
}
