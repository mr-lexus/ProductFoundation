# ADR 0006 — Operation scope and durable execution primitives

## Status

Accepted. Idempotency concurrency was amended by ADR 0008.

## Context

The starter must support both globally scoped products and multi-tenant products.
It also needs safe retries and asynchronous side effects without requiring Redis
or an external broker on day one.

## Decision

- Durable operations use `OperationScope`: `{ kind: "global" }` or an explicit
  `TenantScope`.
- `DATA_SCOPE_MODE=global` exports ordinary SQL and transaction capabilities.
- `DATA_SCOPE_MODE=tenant` exports only `TenantTransactionRunner` to product
  modules. The PostgreSQL adapter installs transaction-local `app.tenant_id`.
- Tenant-owned tables must enable and force RLS, define an explicit policy, run
  under a non-superuser role and pass metadata plus negative cross-tenant tests.
- Authorization remains deny-by-default and always receives the operation scope.
- Every RPC mutation requires `X-Idempotency-Key` and a durable handler invoker.
- Product state, outbox messages, validated output and idempotency completion use
  one PostgreSQL transaction exposed explicitly to the mutation handler.
- Idempotency records contain request hashes, TTL and completed responses. A transaction-scoped
  advisory try-lock returns `in_progress` without blocking concurrent duplicate work; see ADR 0008.
- State changes and outbox messages use one database transaction.
- Outbox delivery uses `FOR UPDATE SKIP LOCKED`, expiring leases with per-claim
  fencing tokens, bounded retry, dead letters and idempotent handlers.
- Processed and dead-letter messages have configurable retention. Worker metrics
  expose pending count, oldest age, retries, dead letters and cleanup.

## Consequences

Simple products do not create fake tenants. Tenant products make isolation
visible in types and DI capabilities. PostgreSQL remains the initial durable
coordination mechanism; an external queue may replace polling only after an ADR
based on measured load.
