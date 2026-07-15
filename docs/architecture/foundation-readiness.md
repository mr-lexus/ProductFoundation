# Foundation readiness

## Статус

Foundation готов к копированию после прохождения acceptance-команд ниже. Он не
содержит предметную область, identity provider или дизайн-систему.

## Что гарантирует foundation

- product-neutral package ownership и автоматические architecture boundaries;
- Node.js 24 reproducible workspace и deterministic formatting/linting;
- NestJS 11 + Fastify 5, native ESM и versioned contract-first RPC;
- обязательную durable idempotency каждой mutation;
- PostgreSQL 17 transactions, namespaced migrations и product migration slot;
- global/tenant scope mode и deny-by-default authorization port;
- transactional outbox с lease ownership, retry, dead letters и retention;
- API/worker health, Prometheus metrics и safe structured diagnostics;
- реальные web/mobile/desktop build contexts и Tauri CSP;
- Docker image, full Compose smoke и CI platform-shell job.

## Acceptance

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm build
pnpm smoke:api
pnpm smoke:compose
pnpm check:native
```

`check:native` требует локальный Rust/Tauri toolchain. CI устанавливает Linux
system dependencies и дополнительно выполняет Tauri build без bundling.

## Что выбирает продукт

- identity/session provider и permission vocabulary;
- `global` или `tenant` data scope;
- product schema и business modules;
- design system и UI;
- object storage, search, realtime и external integrations;
- deployment platform, secrets and telemetry exporter.
