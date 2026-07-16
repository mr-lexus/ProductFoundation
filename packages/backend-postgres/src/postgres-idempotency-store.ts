import type {
  IdempotencyKey,
  IdempotencyStore,
  IdempotencyStoreResult,
  SqlExecutor,
  TransactionRunner
} from "@product-foundation/backend-core";
import { serializeOperationScope } from "@product-foundation/backend-core";
import { installTenantTransactionContext } from "./tenant-transaction-context.js";

interface IdempotencyRow {
  readonly request_hash: string;
  readonly response_body: unknown;
  readonly response_status: number;
}

interface AdvisoryLockRow {
  readonly acquired: boolean;
}

function parameters(key: IdempotencyKey) {
  return [serializeOperationScope(key.scope), key.procedureId, key.key] as const;
}

export class PostgresIdempotencyStore implements IdempotencyStore {
  constructor(private readonly transactions: TransactionRunner) {}

  runAtomically<TBody>(
    key: IdempotencyKey,
    options: { readonly ttlMs: number },
    execute: (
      transaction: SqlExecutor
    ) => Promise<{ readonly body: TBody; readonly status: number }>
  ): Promise<IdempotencyStoreResult<TBody>> {
    return this.transactions.run(async (transaction) => {
      if (key.scope.kind === "tenant") {
        await installTenantTransactionContext(transaction, key.scope);
      }

      const lockIdentity = `${serializeOperationScope(key.scope)}:${key.procedureId}:${key.key}`;
      const lock = await transaction.query<AdvisoryLockRow>(
        "SELECT pg_try_advisory_xact_lock(hashtextextended($1, 0)) AS acquired",
        [lockIdentity]
      );
      if (lock.rows[0]?.acquired !== true) {
        return { kind: "in_progress" };
      }

      await transaction.query(
        `DELETE FROM platform.idempotency_records
         WHERE scope_id = $1 AND procedure_id = $2 AND idempotency_key = $3
           AND expires_at <= now()`,
        parameters(key)
      );
      await transaction.query(
        `WITH expired AS (
           SELECT scope_id, procedure_id, idempotency_key
           FROM platform.idempotency_records
           WHERE expires_at <= now()
           ORDER BY expires_at
           LIMIT 100
           FOR UPDATE SKIP LOCKED
         )
         DELETE FROM platform.idempotency_records AS record
         USING expired
         WHERE record.scope_id = expired.scope_id
           AND record.procedure_id = expired.procedure_id
           AND record.idempotency_key = expired.idempotency_key`
      );

      const existing = await transaction.query<IdempotencyRow>(
        `SELECT request_hash, response_status, response_body
         FROM platform.idempotency_records
         WHERE scope_id = $1 AND procedure_id = $2 AND idempotency_key = $3
         FOR UPDATE`,
        parameters(key)
      );
      const record = existing.rows[0];
      if (record !== undefined) {
        if (record.request_hash !== key.requestHash) {
          return { kind: "conflict" };
        }
        return {
          kind: "replay",
          responseBody: record.response_body as TBody,
          responseStatus: record.response_status
        };
      }

      const response = await execute(transaction);
      const completed = await transaction.query(
        `INSERT INTO platform.idempotency_records (
          scope_id, procedure_id, idempotency_key, request_hash,
          response_status, response_body, expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6, now() + ($7 * interval '1 millisecond'))`,
        [...parameters(key), key.requestHash, response.status, response.body, options.ttlMs]
      );
      if (completed.rowCount !== 1) {
        throw new Error("Idempotency result was not persisted.");
      }

      return {
        kind: "executed",
        responseBody: response.body,
        responseStatus: response.status
      };
    });
  }
}
