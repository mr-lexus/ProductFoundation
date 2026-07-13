# ADR 0006 — Tenant scope and durable execution primitives

- Status: accepted
- Date: 2026-07-12

## Context

Multi-user product data must never cross workspace boundaries. Async
effects must survive process failure, and retried mutations must not duplicate
state changes.

## Decision

- Tenant-owned repositories execute through `TenantTransactionRunner`.
- The PostgreSQL adapter installs `app.workspace_id` with transaction-local
  `set_config` before repository work begins.
- Application authorization is deny-by-default and independent from NestJS.
- Authentication is an application port; token/session choice remains a future
  auth ADR because client requirements are not final.
- Repeatable mutations use a workspace-scoped idempotency ledger with payload
  hash, lease, replay and conflict states.
- Domain change and outbox event are inserted with the same `SqlExecutor` in one
  transaction.
- The worker uses `FOR UPDATE SKIP LOCKED`, leases, bounded exponential backoff
  and an explicit dead-letter state.
- Event handlers are registered only in the worker composition root and must be
  idempotent.

## Consequences

Tenant context is explicit and testable without request-scoped framework magic.
Committed events remain available after API failure. Delivery is at least once,
so consumers still need their own deduplication or idempotent writes. Row-level
security may be added per tenant table as defense in depth; it does not replace
application authorization.
