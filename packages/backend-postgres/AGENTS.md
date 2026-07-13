# AI Development Rules — Backend PostgreSQL

`@product-foundation/backend-postgres` implements backend-core ports with `pg`
and owns foundation SQL migrations.

Allowed here:

- pool lifecycle and transaction mechanics;
- tenant transaction context;
- idempotency and outbox storage;
- migration runner and product-neutral platform tables.

Forbidden here:

- product tables or product-domain vocabulary;
- NestJS/Fastify composition;
- authorization decisions;
- editing an already applied migration.

Migration histories are namespaced. Foundation files use namespace
`foundation`; every product uses its own stable namespace. Integration tests
must run against real PostgreSQL.
