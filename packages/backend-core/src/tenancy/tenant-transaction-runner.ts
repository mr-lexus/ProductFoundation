import type {
  SqlExecutor,
  TransactionOptions
} from "../ports/database.js";
import type { WorkspaceScope } from "../security/request-context.js";

export interface TenantSqlExecutor extends SqlExecutor {
  readonly workspace: WorkspaceScope;
}

export interface TenantTransactionRunner {
  run<T>(
    workspace: WorkspaceScope,
    work: (transaction: TenantSqlExecutor) => Promise<T>,
    options?: TransactionOptions
  ): Promise<T>;
}
