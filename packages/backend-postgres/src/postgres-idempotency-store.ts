import type {
  IdempotencyClaim,
  IdempotencyKey,
  IdempotencyStore
} from "@product-foundation/backend-core";
import type {
  SqlExecutor,
  TransactionRunner
} from "@product-foundation/backend-core";

interface IdempotencyRow {
  readonly locked_until: Date | null;
  readonly request_hash: string;
  readonly response_body: unknown;
  readonly response_status: number | null;
  readonly state: "processing" | "completed" | "failed";
}

function parameters(key: IdempotencyKey) {
  return [key.workspace.workspaceId, key.procedureId, key.key] as const;
}

export class PostgresIdempotencyStore implements IdempotencyStore {
  constructor(
    private readonly sql: SqlExecutor,
    private readonly transactions: TransactionRunner
  ) {}

  claim(
    key: IdempotencyKey,
    options: { readonly leaseMs: number; readonly ttlMs: number }
  ): Promise<IdempotencyClaim> {
    return this.transactions.run(async (transaction) => {
      await transaction.query(
        `DELETE FROM platform.idempotency_records
         WHERE scope_id = $1 AND procedure_id = $2 AND idempotency_key = $3
           AND expires_at <= now()`,
        parameters(key)
      );

      const inserted = await transaction.query(
        `INSERT INTO platform.idempotency_records (
          scope_id, procedure_id, idempotency_key, request_hash, state,
          locked_until, expires_at
        ) VALUES (
          $1, $2, $3, $4, 'processing',
          now() + ($5 * interval '1 millisecond'),
          now() + ($6 * interval '1 millisecond')
        ) ON CONFLICT DO NOTHING
        RETURNING idempotency_key`,
        [...parameters(key), key.requestHash, options.leaseMs, options.ttlMs]
      );
      if (inserted.rowCount === 1) {
        return { kind: "acquired" };
      }

      const existing = await transaction.query<IdempotencyRow>(
        `SELECT request_hash, state, response_status, response_body, locked_until
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
      if (
        record.state === "completed" &&
        record.response_status !== null
      ) {
        return {
          kind: "replay",
          responseBody: record.response_body,
          responseStatus: record.response_status
        };
      }
      if (
        record.state === "processing" &&
        record.locked_until !== null &&
        record.locked_until.getTime() > Date.now()
      ) {
        return { kind: "in_progress" };
      }

      await transaction.query(
        `UPDATE platform.idempotency_records
         SET state = 'processing',
             locked_until = now() + ($4 * interval '1 millisecond'),
             expires_at = now() + ($5 * interval '1 millisecond'),
             updated_at = now()
         WHERE scope_id = $1 AND procedure_id = $2 AND idempotency_key = $3`,
        [...parameters(key), options.leaseMs, options.ttlMs]
      );
      return { kind: "acquired" };
    });
  }

  async complete(
    key: IdempotencyKey,
    response: { readonly body: unknown; readonly status: number }
  ) {
    const result = await this.sql.query(
      `UPDATE platform.idempotency_records
       SET state = 'completed', response_status = $5, response_body = $6,
           locked_until = NULL, updated_at = now()
       WHERE scope_id = $1 AND procedure_id = $2 AND idempotency_key = $3
         AND request_hash = $4 AND state = 'processing'`,
      [...parameters(key), key.requestHash, response.status, response.body]
    );
    if (result.rowCount !== 1) {
      throw new Error("Idempotency completion lost ownership of the record.");
    }
  }

  async release(key: IdempotencyKey) {
    await this.sql.query(
      `UPDATE platform.idempotency_records
       SET state = 'failed', locked_until = NULL, updated_at = now()
       WHERE scope_id = $1 AND procedure_id = $2 AND idempotency_key = $3
         AND request_hash = $4 AND state = 'processing'`,
      [...parameters(key), key.requestHash]
    );
  }
}
