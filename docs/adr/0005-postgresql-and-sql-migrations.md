# ADR 0005 — PostgreSQL driver and SQL migrations

- Status: accepted
- Date: 2026-07-12

## Context

The backend needs durable transactions, optional tenant-aware repositories, idempotency
and a transactional outbox. Product query patterns are not known yet, so an ORM
chosen now would encode assumptions without evidence.

## Decision

- PostgreSQL is the system of record.
- `pg` is the only database driver and is isolated in
  `@product-foundation/backend-postgres`.
- Application code depends on `SqlExecutor`, `TransactionRunner` and
  `TenantTransactionRunner` ports.
- Foundation schema history is a sorted set of immutable SQL files in
  `packages/backend-postgres/migrations`; the ready product history lives in
  `apps/api/migrations` and uses its configured namespace.
- The migration runner uses one PostgreSQL advisory lock, records SHA-256
  checksums and rejects modified applied migrations.
- Deployments run migrations as a separate one-shot step before API/worker.
- Production migrations use expand/contract; down migrations are not the normal
  rollback mechanism.
- A query builder may be added later behind repository implementations after
  real query complexity is measured.

## Consequences

The initial stack is small and SQL remains reviewable. Transactions use one
checked-out client and always commit, roll back and release explicitly. The team
must review SQL carefully and generate repository-specific mapping code. Adding
an ORM later is allowed only as an infrastructure decision; domain and
application contracts do not change.

## Rejected alternatives

- Runtime schema push: unsafe for controlled production deploys.
- Auto-running migrations inside every API replica: creates startup coupling and
  unclear deploy ownership.
- Choosing an ORM before product repositories exist: premature lock-in.
