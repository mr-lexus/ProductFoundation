import type { SqlExecutor } from "@product-foundation/backend-core";

export interface TenantOwnedRelation {
  readonly schema: string;
  readonly table: string;
}

interface TenantIsolationRow {
  readonly force_rls: boolean;
  readonly policy_count: string;
  readonly rls_enabled: boolean;
}

interface RuntimeRoleRow {
  readonly bypasses_rls: boolean;
  readonly is_superuser: boolean;
  readonly role_name: string;
}

const identifierPattern = /^[a-z_][a-z0-9_]{0,62}$/;

export async function assertTenantRuntimeRoleSafe(sql: SqlExecutor) {
  const result = await sql.query<RuntimeRoleRow>(
    `SELECT
       current_user AS role_name,
       role.rolsuper AS is_superuser,
       role.rolbypassrls AS bypasses_rls
     FROM pg_catalog.pg_roles AS role
     WHERE role.rolname = current_user`
  );
  const role = result.rows[0];
  if (role === undefined) {
    throw new Error("The PostgreSQL runtime role could not be inspected.");
  }
  if (role.is_superuser || role.bypasses_rls) {
    throw new Error(`Tenant runtime role ${role.role_name} must be NOSUPERUSER and NOBYPASSRLS.`);
  }
}

export async function assertTenantRelationsSecure(
  sql: SqlExecutor,
  relations: readonly TenantOwnedRelation[]
) {
  for (const relation of relations) {
    if (!identifierPattern.test(relation.schema) || !identifierPattern.test(relation.table)) {
      throw new Error("Tenant relation names must be lowercase PostgreSQL identifiers.");
    }
    const result = await sql.query<TenantIsolationRow>(
      `SELECT
         relation.relrowsecurity AS rls_enabled,
         relation.relforcerowsecurity AS force_rls,
         count(policy.oid)::text AS policy_count
       FROM pg_catalog.pg_class AS relation
       JOIN pg_catalog.pg_namespace AS namespace ON namespace.oid = relation.relnamespace
       LEFT JOIN pg_catalog.pg_policy AS policy ON policy.polrelid = relation.oid
       WHERE namespace.nspname = $1 AND relation.relname = $2
         AND relation.relkind IN ('r', 'p')
       GROUP BY relation.oid`,
      [relation.schema, relation.table]
    );
    const status = result.rows[0];
    const qualifiedName = `${relation.schema}.${relation.table}`;
    if (status === undefined) {
      throw new Error(`Tenant relation ${qualifiedName} does not exist.`);
    }
    if (!status.rls_enabled || !status.force_rls || Number(status.policy_count) < 1) {
      throw new Error(
        `Tenant relation ${qualifiedName} must enable and force RLS with at least one policy.`
      );
    }
  }
}
