import type { SqlExecutor, TransactionOptions } from "../ports/database.js";
import type { TenantScope } from "../security/request-context.js";

export interface TenantSqlExecutor extends SqlExecutor {
  readonly scope: TenantScope;
}

export interface TenantTransactionRunner {
  run<T>(
    scope: TenantScope,
    work: (transaction: TenantSqlExecutor) => Promise<T>,
    options?: TransactionOptions
  ): Promise<T>;
}
