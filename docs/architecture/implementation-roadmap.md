# Foundation implementation roadmap

[Русская версия](./implementation-roadmap-RU.md)

This roadmap covers only the technical foundation. The product roadmap, UI and
design system are created after copying the repository.

## Completed

### Boundaries and toolchain

- Modular monolith and thin platform shells.
- Neutral `@product-foundation/*` and replaceable `@app/*`.
- NestJS/Fastify only at the composition/transport edge.
- FSD frontend dependency direction.
- Architecture checks for source imports, package manifests and dependency cycles.
- Node.js 24, pnpm lockfile and Biome formatting/linting.

### Contracts and platforms

- Versioned contract-first RPC and Zod runtime validation.
- Common request ID, typed errors and cancellation.
- A durable invoker for every RPC mutation, with output validation before commit.
- Independent Web/Mobile/Desktop entrypoints and shell-local dist outputs.
- Web-only generateSW PWA with prompt updates and no API runtime cache.
- Same-origin Web API, mandatory native API URL and Tauri CSP.

### Data and reliability

- PostgreSQL pool, transactions and readiness.
- Foundation migrations and a ready product migration namespace/directory.
- `global | tenant` operation scope without artificial tenants.
- Atomic idempotency transactions for state, outbox and validated response.
- Transactional outbox, concurrent claim delivery, per-claim fencing tokens,
  retry/dead-letter handling and retention.
- Worker health, Prometheus metrics and graceful shutdown.

### Delivery

- Redacted structured diagnostics, Helmet, CORS, body/rate limits.
- Package, API and PostgreSQL integration tests.
- Production Web/API build and compiled smoke tests.
- Modern pnpm deploy, Docker Compose full-stack smoke and GitHub Actions.
- A separate CI check for Capacitor/Tauri shells.

## Next stage: a concrete product

1. Run and verify `pnpm product:rename -- ... --write`.
2. Choose `DATA_SCOPE_MODE`, identity/session model and permissions.
3. Create the first product contract and backend capability.
4. Add the first migration to `apps/api/migrations`.
5. Create a design system and the first frontend vertical slice.
6. Add product-specific authorization/isolation tests.
7. Configure secrets, ingress, backups and a telemetry exporter.

## Do not add in advance

Microservices, Redis, external queues/search, CRDTs and a distributed tracing
backend require demonstrated need and an ADR.
