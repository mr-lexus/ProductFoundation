# Developer guide

[Русская версия](./DEVELOPER_GUIDE-RU.md)

This is the practical map for starting and changing a product. The root [README](./README.md)
explains the system model; [architecture documentation](./docs/architecture/README.md) records
rationale and deeper rules.

## First hour in the repository

For evaluation, clone the repository. For a product, copy a tagged foundation release and keep its
`FOUNDATION_VERSION`; do not start from an arbitrary branch revision.

### 1. Run the reference application

Requirements: Node.js 24, pnpm 11.7.0, and Docker with Compose.

```bash
pnpm install --frozen-lockfile
cp .env.example .env
docker compose up --detach --wait database
pnpm db:migrate:dev
pnpm dev:demo
```

Open `http://localhost:1420`. Readiness is at
`http://localhost:3001/health/ready`; metrics are at `http://localhost:3001/metrics`.
The worker is a separate runtime:

```bash
pnpm --filter @app/api worker:dev
```

### 2. Inspect the two reference paths

- [System ping](./docs/architecture/system-ping-flow.md) is the smallest contract → client → API →
  React vertical slice.
- [Reference durable flow](./docs/architecture/reference-durable-flow.md) connects a mutation to
  PostgreSQL idempotency, product state, outbox, worker delivery, and a status query.

The durable flow is also proved by the
[HTTP integration test](./apps/api/src/app/http/reference-durable-probe.integration.test.ts) and
[Compose smoke](./scripts/smoke-compose.mjs).

### 3. Preview and apply product identity

Do this before generating Android or iOS projects. Preview the deterministic rename, review every
listed file, then apply it:

```bash
pnpm product:rename -- --name "Example Product" --slug example-product \
  --id com.example.product --namespace example
pnpm product:rename -- --name "Example Product" --slug example-product \
  --id com.example.product --namespace example --write
```

`--short-name` optionally sets the Web manifest short name. The internal
`@product-foundation/*` namespace may remain unchanged. Rename `@app/*` only when the team wants
a different product package namespace.

### 4. Choose the data scope

Set `DATA_SCOPE_MODE=global` or `tenant` deliberately.

- `global` exposes ordinary SQL and transaction ports.
- `tenant` exposes product modules only to `TenantTransactionRunner`.

Tenant context is not isolation by itself. Every tenant-owned table must enable and force RLS,
define an `app.tenant_id` policy, run under the non-superuser runtime role, pass
`assertTenantRelationsSecure`, and have negative cross-tenant tests. Follow the
[tenant isolation contract](./docs/architecture/tenant-isolation.md).

### 5. Add the first product capability

1. Define the public procedure and Zod schemas in `packages/contracts/src`.
2. Add the owning backend module under `apps/api/src/modules/<capability>`.
3. Add product SQL in `apps/api/migrations` when state is persisted.
4. Register the module in the API composition root.
5. Add the typed API wrapper in `packages/frontend-app/src/shared/api`.
6. Put query/mutation integration in the owning frontend entity or feature.
7. Add boundary, application, and integration tests appropriate to the change.
8. Run the relevant verification commands below.

Use [where to put code](./docs/architecture/where-to-put-code.md) when the owner is not obvious.

## Repository map

```text
apps/
  api/          NestJS composition, product backend modules, worker
  web/          Web/PWA runtime shell
  mobile/       Capacitor runtime shell
  desktop/      Tauri runtime shell

packages/
  contracts/          product Zod/RPC contracts
  frontend-app/       shared React product application
  rpc/                protocol primitives and envelopes
  rpc-client/         typed execution, cancellation, errors
  rpc-server/         validation and handler execution
  backend-core/       ports, scopes, idempotency/outbox orchestration
  backend-postgres/   PostgreSQL adapters and foundation migrations
  config/             shared tooling configuration
```

`@product-foundation/*` is reusable product-neutral code. `@app/*` is the replaceable product
layer. Foundation packages never import product packages. Cross-package imports use public package
exports.

## Adding RPC procedures

The contract is the navigation root for every public operation:

```text
packages/contracts
  → frontend shared/api wrapper
  → owning frontend entity or feature
  → apps/api module transport
  → application use case
  → domain and infrastructure as required
```

For a query:

- define input and output schemas and `kind: "query"`;
- add a thin transport handler and application use case;
- add a TanStack Query wrapper in the owning frontend slice;
- test success, input validation, output validation, and expected public errors.

For a mutation:

- define `kind: "mutation"`;
- require `X-Idempotency-Key` and use the durable mutation invoker;
- use only `context.execution.transaction` for state and outbox writes;
- add a TanStack mutation wrapper in the owning feature;
- test replay, payload conflict, rollback, and external-effect delivery when applicable.

Do not put repositories, business services, framework DTOs, or transport behavior in
`packages/contracts`. See [the RPC protocol](./docs/architecture/rpc-protocol.md) for envelopes,
versioning, cancellation, and error rules.

## Backend capability shape

```text
apps/api/src/modules/<capability>/
  contract/       local re-export/link to public contracts
  domain/         pure business rules
  application/    use cases, permissions, ports, transaction orchestration
  infrastructure/ product repository and integration adapters
  transport/      thin NestJS controllers and module composition
```

Dependencies point inward: `transport/infrastructure → application → domain`. Domain and
application code do not import NestJS, Fastify, or `pg`. A capability does not need every
directory; create only the layers required by its behavior.

## Durable RPC mutations

Every mutation uses the invoker in
`apps/api/src/shared/application/create-idempotent-rpc-handler-invoker.ts`. The handler receives
`context.execution.transaction`. State writes and outbox appends must use that exact executor so
the validated output, idempotency completion, state, and outbox commit atomically.

Do not open a nested transaction. Do not call an external system from the transaction. Append an
event and use an idempotent worker handler instead. Concurrent duplicate requests are fenced by a
transaction-scoped advisory try-lock; long work remains a short transaction plus an outbox event.

## Shared frontend and runtime shells

Product UI lives in `packages/frontend-app`. Each shell owns its entrypoint, runtime composition,
build configuration, artifacts, lifecycle, and platform APIs. Only Web owns the service worker and
PWA update UI. Capacitor imports stay in `apps/mobile`; Tauri imports stay in `apps/desktop`.

```text
app → pages → widgets → features → entities → shared
```

This lightweight Feature-Sliced direction is an ownership tool, not a directory quota. Do not
create `features/open-modal`, `features/change-input`, or `entities/button` merely to use every
layer. Pick the simplest location with a clear owner and downward dependencies. Cross-slice imports
use the slice public `index.ts`.

- server state: TanStack Query;
- local component state: React;
- shared client store: only after a concrete cross-component or long-lived workflow requires it;
- HTTP/RPC transport: `shared/api`, not components;
- product workflows: `features`;
- domain meaning: `entities`.

When a real feature needs native share, filesystem, notifications, or another platform difference,
define one capability interface for that consumer and inject shell adapters. Do not add a generic
service locator or distribute platform conditionals through shared code.

Runtime commands and security constraints are in
[local development](./docs/architecture/local-development.md) and the
[environment contract](./docs/architecture/environment-contract.md).

## PostgreSQL and worker

- Foundation migrations: `packages/backend-postgres/migrations`.
- Product migrations: `apps/api/migrations`.
- Applied migrations are immutable and checksum-verified.
- Outbox delivery is at least once; handlers remain idempotent.
- Worker readiness: `:9464/health/ready`; metrics: `:9464/metrics`.
- Inspection and confirmed replay commands are documented in the
  [operations runbook](./docs/architecture/operations-runbook.md).

## Verification map

```bash
pnpm check:docs         # Markdown links and language consistency
pnpm check:architecture # ownership and dependency boundaries
pnpm test:tooling       # architecture/rename/runtime tooling regressions
pnpm check              # all deterministic local gates and unit tests
TEST_DATABASE_URL=postgresql://... pnpm check:ci # plus PostgreSQL integration tests
pnpm build
pnpm smoke:api
pnpm smoke:compose
pnpm check:native
```

Use the smallest relevant checks while iterating, then the complete required gate for the change.
Database/durable changes require real PostgreSQL integration tests. Native configuration changes
require `pnpm check:native`.

## After copying

Keep `FOUNDATION_VERSION`. Foundation releases are snapshots, not an automatic update channel.
Review later upstream changelogs and port security, data-integrity, and reliability fixes through a
normal product pull request. See [template lifecycle](./docs/architecture/template-lifecycle.md).
