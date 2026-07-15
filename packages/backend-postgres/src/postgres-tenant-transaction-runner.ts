import type {
  SqlExecutor,
  TenantScope,
  TenantSqlExecutor,
  TenantTransactionRunner,
  TransactionOptions,
  TransactionRunner
} from "@product-foundation/backend-core";

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
      await transaction.query("SELECT set_config('app.tenant_id', $1, true)", [scope.tenantId]);
      return work(scopeExecutor(transaction, scope));
    }, options);
  }
}
