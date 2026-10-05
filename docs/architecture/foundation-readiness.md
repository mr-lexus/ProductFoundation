# Foundation readiness

[Русская версия](./foundation-readiness-RU.md)

## Status

The foundation is in public beta and is ready to copy after the acceptance
commands below pass. A production-ready baseline claim requires a published
durable reference flow and a successful full CI run. The foundation contains no
product domain, identity provider or design system.

## Foundation guarantees

- Product-neutral package ownership and automated architecture boundaries.
- A reproducible Node.js 24 workspace and deterministic formatting/linting.
- NestJS 11 + Fastify 5, native ESM and versioned contract-first RPC.
- Atomic PostgreSQL idempotency: state, outbox and validated result commit in one mutation transaction.
- PostgreSQL 17 transactions, namespaced migrations and a product migration directory.
- Global scope or tenant execution context with a mandatory forced-RLS contract.
- Transactional outbox with expiring leases, per-claim fencing tokens, retry, dead letters and retention.
- API/worker health, Prometheus metrics and safe structured diagnostics.
- Real Web/Mobile/Desktop build contexts and Tauri CSP.
- A Docker image, full Compose smoke and a CI platform-shell job.

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

`check:ci` requires PostgreSQL and does not allow silently skipped integration tests.
`check:native` requires a local Rust/Tauri toolchain. CI installs the Linux system
dependencies and also runs a Tauri build without bundling.

## Frontend/runtime verification

The three frontend outputs are independent and share one React application.
Run `pnpm test:frontend-artifacts` followed by `pnpm check:frontend-artifacts` to check
concurrent builds, roots, packaging paths, manifest/icons and native PWA exclusion.
`pnpm --filter @app/web test:pwa` checks production registration, offline SPA shell
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

## Product choices

- Identity/session provider and permission vocabulary.
- `global` or `tenant` data scope.
- Product schema and business modules.
- Design system and UI.
- Object storage, search, realtime and external integrations.
- Deployment platform, secrets and telemetry exporter.
