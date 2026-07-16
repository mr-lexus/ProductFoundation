import type { SqlExecutor, TenantScope } from "@product-foundation/backend-core";

export async function installTenantTransactionContext(
  transaction: SqlExecutor,
  scope: TenantScope
) {
  await transaction.query("SET LOCAL row_security = on");
  await transaction.query("SELECT set_config('app.tenant_id', $1, true)", [scope.tenantId]);
}
