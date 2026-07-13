export interface SqlQueryResult<TRow extends object> {
  readonly rowCount: number | null;
  readonly rows: readonly TRow[];
}

export interface SqlExecutor {
  query<TRow extends object = Record<string, unknown>>(
    text: string,
    values?: readonly unknown[]
  ): Promise<SqlQueryResult<TRow>>;
}

export type TransactionIsolationLevel =
  | "read committed"
  | "repeatable read"
  | "serializable";

export interface TransactionOptions {
  readonly isolationLevel?: TransactionIsolationLevel;
  readonly readOnly?: boolean;
}

export interface TransactionRunner {
  run<T>(
    work: (transaction: SqlExecutor) => Promise<T>,
    options?: TransactionOptions
  ): Promise<T>;
}

export interface DatabaseHealthCheck {
  check(): Promise<void>;
}
