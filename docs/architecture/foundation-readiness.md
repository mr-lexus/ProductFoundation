# Foundation readiness

## Статус

Foundation имеет статус public beta и готов к копированию после прохождения acceptance-команд
ниже. Статус production-ready baseline возвращается только после публикации reference durable
flow и зелёного полного CI. Foundation не содержит предметную область, identity provider или
дизайн-систему.

## Что гарантирует foundation

- product-neutral package ownership и автоматические architecture boundaries;
- Node.js 24 reproducible workspace и deterministic formatting/linting;
- NestJS 11 + Fastify 5, native ESM и versioned contract-first RPC;
- атомарную PostgreSQL idempotency: state, outbox и validated result фиксируются
  одной mutation transaction;
- PostgreSQL 17 transactions, namespaced migrations и product migration slot;
- global scope или tenant execution context с обязательным forced-RLS contract;
- transactional outbox с expiring lease, per-claim fencing token, retry, dead letters и retention;
- API/worker health, Prometheus metrics и safe structured diagnostics;
- реальные web/mobile/desktop build contexts и Tauri CSP;
- Docker image, full Compose smoke и CI platform-shell job.

## Acceptance

```bash
pnpm install --frozen-lockfile
pnpm check
TEST_DATABASE_URL=postgresql://... pnpm check:ci
pnpm build
pnpm smoke:api
pnpm smoke:compose
pnpm check:native
```

`check:ci` требует PostgreSQL и не допускает silently skipped integration tests.
`check:native` требует локальный Rust/Tauri toolchain. CI устанавливает Linux system
dependencies и дополнительно выполняет Tauri build без bundling.

## Frontend/runtime verification

The three frontend outputs are independent and share one React application.
Run pnpm test:frontend-artifacts followed by pnpm check:frontend-artifacts to check
concurrent builds, roots, packaging paths, manifest/icons and native PWA exclusion.
pnpm --filter @app/web test:pwa checks production registration, offline SPA shell
navigation and absence of API runtime caching. It intentionally has no mandatory
two-build update test.

CI retains every-PR Android assembleDebug and Tauri Linux compilation. Windows
Tauri, macOS Tauri and unsigned iOS simulator compilation run for relevant PRs
and weekly/manual runs. The native-coverage status requires every applicable job
to succeed and reports an explicit skip for unrelated PRs. Main-branch pushes
retain the baseline jobs; extended coverage is selected by PR/schedule/manual events.

Capacitor configuration checks, native project generation/sync, native compilation
and device execution are different verification levels. iOS compilation requires
macOS/Xcode; a Linux sync is not an iOS build. The origin table is configuration-
and framework-source-verified with exact CORS preflight tests, not device E2E.
Store packaging, signing, notarization and device UI smoke remain product-owned.

## Что выбирает продукт

- identity/session provider и permission vocabulary;
- `global` или `tenant` data scope;
- product schema и business modules;
- design system и UI;
- object storage, search, realtime и external integrations;
- deployment platform, secrets and telemetry exporter.
