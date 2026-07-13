import type {
  SqlExecutor,
  TransactionOptions,
  TransactionRunner
} from "@product-foundation/backend-core";
import type { WorkspaceScope } from "@product-foundation/backend-core";
import type {
  TenantSqlExecutor,
  TenantTransactionRunner
} from "@product-foundation/backend-core";

function scopeExecutor(
  transaction: SqlExecutor,
  workspace: WorkspaceScope
): TenantSqlExecutor {
  return {
    query: (text, values) => transaction.query(text, values),
    workspace
  };
}

export class PostgresTenantTransactionRunner
  implements TenantTransactionRunner
{
  constructor(private readonly transactions: TransactionRunner) {}

  run<T>(
    workspace: WorkspaceScope,
    work: (transaction: TenantSqlExecutor) => Promise<T>,
    options?: TransactionOptions
  ) {
    return this.transactions.run(async (transaction) => {
      await transaction.query(
        "SELECT set_config('app.workspace_id', $1, true)",
        [workspace.workspaceId]
      );
      return work(scopeExecutor(transaction, workspace));
    }, options);
  }
}
