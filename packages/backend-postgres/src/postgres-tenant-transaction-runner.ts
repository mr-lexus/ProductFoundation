import type {
  SqlExecutor,
  TenantScope,
  TenantSqlExecutor,
  TenantTransactionRunner,
  TransactionOptions,
  TransactionRunner
} from "@product-foundation/backend-core";
import { installTenantTransactionContext } from "./tenant-transaction-context.js";

function scopeExecutor(transaction: SqlExecutor, scope: TenantScope): TenantSqlExecutor {
  return {
    query: (text, values) => transaction.query(text, values),
    scope
  };
}

export class PostgresTenantTransactionRunner implements TenantTransactionRunner {
  constructor(private readonly transactions: TransactionRunner) {}

  run<T>(
    scope: TenantScope,
    work: (transaction: TenantSqlExecutor) => Promise<T>,
    options?: TransactionOptions
  ) {
    return this.transactions.run(async (transaction) => {
      await installTenantTransactionContext(transaction, scope);
      return work(scopeExecutor(transaction, scope));
    }, options);
  }
}
