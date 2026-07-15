# Product Foundation

Production-oriented, product-neutral foundation for building long-lived web,
mobile, and desktop applications on a shared TypeScript stack.

[Русская версия](./README-RU.md)

## What it is

Product Foundation is a reusable monorepo for launching multiple products on a
shared stack. It provides enforceable architecture boundaries, runtime shells,
and reliability primitives without coupling the repository to a business
domain, design system, or authentication provider.

It is not a collection of preinstalled libraries and it is not a ready-made
SaaS product. It is the technical foundation: copy the repository, add the
product layer, and start building.

## What is included

- one React frontend shared by browser, Capacitor, and Tauri;
- NestJS + Fastify backend;
- PostgreSQL and versioned SQL migrations;
- contract-first RPC with Zod runtime validation;
- mandatory durable idempotency for mutations;
- global and tenant data scopes without fake tenants;
- transactional outbox, retry, dead-letter, and retention;
- a separate background worker with health checks and Prometheus metrics;
- request IDs, CORS, Helmet, rate/body limits, and safe structured logs;
- Biome, TypeScript, unit/integration tests, and architecture gates;
- production Docker image, Docker Compose smoke, and GitHub Actions;
- rules for AI agents and human-readable developer documentation.

## Architecture model

```text
apps/                         runtime and composition
  api/                        NestJS API, product modules, worker
  web/                        browser shell
  mobile/                     Capacitor shell
  desktop/                    Tauri shell

packages/                     reusable code
  contracts/                  product RPC schemas and DTOs
  frontend-app/               shared React application
  rpc/                        framework-neutral RPC protocol
  rpc-client/                 framework-neutral RPC client
  rpc-server/                 framework-neutral RPC executor
  backend-core/               backend ports and durable orchestration
  backend-postgres/           PostgreSQL adapters and foundation migrations
  config/                     shared tooling configuration
```

`@product-foundation/*` is the product-neutral technical core. It never depends
on product code.

`@app/*` is the replaceable product layer: contracts, UI, backend capabilities,
and configuration.

Web, mobile, and desktop expose the same application from `frontend-app`.
Platform-specific code stays inside thin runtime shells.

## Quick start

Requirements:

- Node.js 24;
- pnpm 11.7.0;
- PostgreSQL 17 or Docker for the local database.

```bash
pnpm install --frozen-lockfile
cp .env.example .env
docker compose up --detach --wait database
pnpm db:migrate:dev
pnpm dev:demo
```

- Web: `http://localhost:1420`
- API: `http://localhost:3001`
- API readiness: `http://localhost:3001/health/ready`
- API metrics: `http://localhost:3001/metrics`

## Repository verification

```bash
pnpm check          # Biome, boundaries, TypeScript, and tests
pnpm build          # production web and API
pnpm smoke:api      # compiled API smoke test
pnpm smoke:compose  # PostgreSQL, migrations, API, and worker
pnpm check:native   # Capacitor config and Rust/Tauri
```

CI additionally runs PostgreSQL integration tests, the Compose smoke test, and
a Tauri build without bundling.

## Starting a new product

1. Rename the placeholder identifiers and migration namespace.
2. Choose `DATA_SCOPE_MODE=global` or `tenant`.
3. Add the first contract to `packages/contracts`.
4. Create a backend capability in `apps/api/src/modules`.
5. Add a product migration to `apps/api/migrations`.
6. Create the first frontend vertical slice in `packages/frontend-app`.
7. Connect the selected identity, permissions, design system, and deployment.

Read [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) for a concise map of the
repository and its rules.

## Intentionally not included

- product-specific business logic;
- an identity provider or session model;
- a product permission vocabulary;
- a design system or finished UI;
- cloud-specific deployment or a secrets manager;
- external search, queue, storage, or realtime services.

These decisions are added only when the product requirements are known.

## Documentation

- [Developer guide](./DEVELOPER_GUIDE.md)
- [Architecture overview](./docs/architecture/README.md)
- [Foundation readiness](./docs/architecture/foundation-readiness.md)
- [Architecture decisions](./docs/adr)
- [AI development rules](./AGENTS.md)
