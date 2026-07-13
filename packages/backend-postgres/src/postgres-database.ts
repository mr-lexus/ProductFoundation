import { Pool, type PoolClient, type PoolConfig } from "pg";
import type {
  DatabaseHealthCheck,
  SqlExecutor,
  SqlQueryResult,
  TransactionIsolationLevel,
  TransactionOptions,
  TransactionRunner
} from "@product-foundation/backend-core";

export interface PostgresDatabaseOptions {
  readonly connectionTimeoutMs: number;
  readonly maxConnections: number;
  readonly onUnexpectedPoolError?: (error: Error) => void;
  readonly url: string;
}

const isolationStatements: Readonly<
  Record<TransactionIsolationLevel, string>
> = {
  "read committed": "SET TRANSACTION ISOLATION LEVEL READ COMMITTED",
  "repeatable read": "SET TRANSACTION ISOLATION LEVEL REPEATABLE READ",
  serializable: "SET TRANSACTION ISOLATION LEVEL SERIALIZABLE"
};

function createPoolConfig(options: PostgresDatabaseOptions): PoolConfig {
  return {
    allowExitOnIdle: false,
    connectionString: options.url,
    connectionTimeoutMillis: options.connectionTimeoutMs,
    max: options.maxConnections
  };
}

function createExecutor(client: PoolClient): SqlExecutor {
  return {
    async query<TRow extends object>(text: string, values = []) {
      const result = await client.query(text, [...values]);
      return { rowCount: result.rowCount, rows: result.rows as TRow[] };
    }
  };
}

export class PostgresDatabase
  implements SqlExecutor, TransactionRunner, DatabaseHealthCheck
{
  readonly #pool: Pool;

  constructor(options: PostgresDatabaseOptions) {
    this.#pool = new Pool(createPoolConfig(options));
    this.#pool.on("error", (error) => {
      options.onUnexpectedPoolError?.(error);
    });
  }

  async check() {
    await this.#pool.query("SELECT 1");
  }

  async close() {
    await this.#pool.end();
  }

  async query<TRow extends object = Record<string, unknown>>(
    text: string,
    values: readonly unknown[] = []
  ): Promise<SqlQueryResult<TRow>> {
    const result = await this.#pool.query(text, [...values]);
    return { rowCount: result.rowCount, rows: result.rows as TRow[] };
  }

  async run<T>(
    work: (transaction: SqlExecutor) => Promise<T>,
    options: TransactionOptions = {}
  ): Promise<T> {
    const client = await this.#pool.connect();

    try {
      await client.query("BEGIN");

      if (options.isolationLevel !== undefined) {
        await client.query(isolationStatements[options.isolationLevel]);
      }
      if (options.readOnly === true) {
        await client.query("SET TRANSACTION READ ONLY");
      }

      const result = await work(createExecutor(client));
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
