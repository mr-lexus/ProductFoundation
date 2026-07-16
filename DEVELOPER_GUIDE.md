# Developer guide

[Русская версия](./DEVELOPER_GUIDE-RU.md)

## Purpose

Product Foundation is a product-neutral technical baseline. It contains one shared frontend,
a NestJS API, contract-first RPC, PostgreSQL adapters, a worker, verification, Docker and CI.
It intentionally does not choose a product domain, identity provider or design system.

## Repository map

```text
apps/
  api/          NestJS composition, product backend modules and worker
  web/          Vite shell for the shared frontend
  mobile/       Capacitor shell
  desktop/      Tauri shell

packages/
  contracts/          product Zod/RPC contracts
  frontend-app/       shared React application
  rpc/                protocol and envelopes
  rpc-client/         fetch/cancellation/typed errors
  rpc-server/         validation and procedure execution
  backend-core/       ports, operation scope, idempotency and outbox orchestration
  backend-postgres/   PostgreSQL adapters and foundation migrations
  config/             shared tooling configuration
```

`@product-foundation/*` is reusable technical code. `@app/*` is the replaceable product
layer. Foundation packages never import product packages.

## Starting a product

1. Rename the placeholder identifiers listed below.
2. Choose `DATA_SCOPE_MODE=global` or `tenant`.
3. Choose the identity/session model and permission vocabulary.
4. Add the first public contract in `packages/contracts`.
5. Add a backend capability in `apps/api/src/modules/<name>`.
6. Add product SQL migrations in `apps/api/migrations`.
7. Add a frontend vertical slice in `packages/frontend-app/src`.
8. Run the relevant acceptance checks.

## Backend capability

```text
apps/api/src/modules/<name>/
  contract/       link to public contracts
  domain/         pure business rules
  application/    use cases, permissions, ports and transactions
  infrastructure/ product repository adapters
  transport/      thin NestJS controllers and module composition
```

Dependencies point inward: `transport/infrastructure → application → domain`. Domain and
application code do not import NestJS, Fastify or `pg`.

## Durable RPC mutations

Every mutation requires `X-Idempotency-Key` and the invoker from
`apps/api/src/shared/application/create-idempotent-rpc-handler-invoker.ts`.

The mutation handler receives `context.execution.transaction`. All PostgreSQL state changes
and outbox appends for that mutation must use this exact executor. The invoker validates the
public output, completes the idempotency record and commits all effects in one transaction.
If the handler or output validation fails, the state, outbox and ledger all roll back.

Do not open a nested transaction from a mutation handler. External side effects cannot be
made atomic with PostgreSQL; write an outbox event in the transaction and deliver it through
an idempotent worker handler.

The synchronous handler must finish within its configured lease. Long work becomes a short
transaction plus an outbox event.

## Global and tenant data

`DATA_SCOPE_MODE=global` exposes ordinary SQL and transaction ports.

`DATA_SCOPE_MODE=tenant` exposes only `TenantTransactionRunner` to product modules. The runner
sets transaction-local `app.tenant_id` and enables row security. This context is not sufficient
on its own: every tenant-owned table must force RLS, define an explicit policy, run under a
non-superuser role and pass negative cross-tenant tests. Follow
[the tenant isolation contract](./docs/architecture/tenant-isolation.md).

Idempotency, outbox and audit use `OperationScope`, so global products do not invent a tenant.

## PostgreSQL and worker

- Foundation migrations: `packages/backend-postgres/migrations`.
- Product migrations: `apps/api/migrations`.
- Applied migrations are immutable and checksum-verified.
- State changes and outbox events share one transaction.
- Claimed outbox messages start concurrently so leases do not expire in a local queue.
- Handlers remain idempotent because outbox delivery is at least once.
- Worker health: `:9464/health/ready`; metrics: `:9464/metrics`.

## Frontend and platforms

The shared frontend follows:

```text
app → pages → widgets → features → entities → shared
```

HTTP/RPC lives in `shared/api`, server state in TanStack Query, and local state in React unless
a real cross-component workflow requires a client store.

Web uses a same-origin production API by default. `VITE_API_URL` is required for Capacitor and
Tauri builds.

```bash
pnpm build:web
VITE_API_URL=https://api.example.com pnpm build:mobile
VITE_API_URL=https://api.example.com pnpm tauri:build
```

## Rename after copying

- `product-foundation-starter` — repository/root package name;
- `Product Starter` — application titles;
- `com.example.product` — Capacitor/Tauri identifiers;
- `app` — product migration namespace, PostgreSQL names and metric prefix;
- `@app/*` — only when the team wants its own package namespace.

The internal `@product-foundation/*` namespace may remain unchanged.

## Verification

```bash
pnpm check          # formatting, boundaries, TypeScript and tests
pnpm build          # production web/API build
pnpm smoke:api      # compiled API
pnpm smoke:compose  # database, migrations, API and worker
pnpm check:native   # Capacitor config and Rust/Tauri
```

PostgreSQL integration tests require `TEST_DATABASE_URL` and run in CI. A copied product is not
ready for traffic until it also completes the product-specific checklist in `README.md` and
`SECURITY.md`.
