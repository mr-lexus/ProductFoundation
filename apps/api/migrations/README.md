# Product migrations

Place product-owned SQL migrations here using names such as
`0001_create_accounts.sql`. They run after foundation migrations under the
stable namespace configured by `PRODUCT_MIGRATION_NAMESPACE`.

Never edit a migration after it has been applied. Foundation migrations remain
in `packages/backend-postgres/migrations`.
