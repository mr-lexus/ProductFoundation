# Foundation implementation roadmap

Этот roadmap относится только к технической основе. Product roadmap, UI и
design system создаются после копирования репозитория.

## Выполнено

### Boundaries и toolchain

- modular monolith и thin platform shells;
- нейтральные `@product-foundation/*` и заменяемые `@app/*`;
- NestJS/Fastify только на composition/transport edge;
- FSD frontend direction;
- architecture gate для source imports, package manifests и dependency cycles;
- Node.js 24, pnpm lockfile, Biome formatter/linter.

### Contracts и platforms

- versioned contract-first RPC и Zod runtime validation;
- единый request ID, typed errors и cancellation;
- durable invoker обязателен для каждой RPC mutation;
- отдельный `web | mobile | desktop` build context общего frontend;
- same-origin web API, обязательный native API URL и Tauri CSP.

### Data и reliability

- PostgreSQL pool, transactions и readiness;
- foundation + готовый product migration namespace/directory;
- `global | tenant` operation scope без фиктивных tenants;
- idempotency payload hash, lease ownership, replay и cleanup;
- transactional outbox, ownership checks, retry/dead-letter и retention;
- worker health, Prometheus metrics и graceful shutdown.

### Delivery

- redacted structured diagnostics, Helmet, CORS, body/rate limits;
- package, API and PostgreSQL integration tests;
- production web/API build and compiled smoke;
- modern pnpm deploy, Docker Compose full-stack smoke and GitHub Actions;
- отдельная CI-проверка Capacitor/Tauri shell.

## Следующий этап — конкретный продукт

1. Переименовать placeholder identifiers.
2. Выбрать `DATA_SCOPE_MODE`, identity/session model и permissions.
3. Создать первый product contract и backend capability.
4. Добавить первую миграцию в готовый `apps/api/migrations`.
5. Создать design system и первый frontend vertical slice.
6. Добавить product-specific authorization/isolation tests.
7. Настроить secrets, ingress, backups и telemetry exporter.

## Не добавлять заранее

Microservices, Redis, external queue/search, CRDT и distributed tracing backend
добавляются только по измеренной необходимости и через ADR.
