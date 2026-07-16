# Tenant isolation contract

`DATA_SCOPE_MODE=tenant` narrows product DI to `TenantTransactionRunner` and installs
transaction-local `app.tenant_id`. This context is necessary, but it is not a database
security boundary by itself.

Every tenant-owned product table must satisfy all of the following before the product is
considered tenant-safe:

1. include a non-null `tenant_id uuid` ownership column;
2. enable and **force** PostgreSQL row-level security;
3. define `USING` and `WITH CHECK` policies based on `app.tenant_id`;
4. use a non-superuser runtime database role;
5. register the table in startup/readiness or integration tests through
   `assertTenantRelationsSecure`;
6. include negative cross-tenant read and write tests using the runtime role.

Minimal migration pattern:

```sql
ALTER TABLE app.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.documents FORCE ROW LEVEL SECURITY;

CREATE POLICY documents_tenant_scope
ON app.documents
USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
```

Minimal verification:

```ts
await assertTenantRelationsSecure(database, [
  { schema: "app", table: "documents" }
]);
```

`assertTenantRelationsSecure` verifies that the relation exists, RLS is enabled and forced,
and at least one policy exists. It cannot determine whether a policy expresses the correct
product ownership rule, so cross-tenant tests remain mandatory.

Do not run tenant products with a PostgreSQL superuser: superusers bypass row-level security.
API startup enforces this through `assertTenantRuntimeRoleSafe` when
`DATA_SCOPE_MODE=tenant`; roles with `SUPERUSER` or `BYPASSRLS` are rejected.
