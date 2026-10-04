# Architecture documentation

Начните с корневого [`DEVELOPER_GUIDE.md`](../../DEVELOPER_GUIDE.md) или
[`DEVELOPER_GUIDE-RU.md`](../../DEVELOPER_GUIDE-RU.md).

- [`target-architecture.md`](./target-architecture.md) — runtimes, dependency flow и data boundaries;
- [`monorepo-layout.md`](./monorepo-layout.md) — владелец каждого каталога;
- [`where-to-put-code.md`](./where-to-put-code.md) — куда положить новый файл;
- [`foundation-boundaries.md`](./foundation-boundaries.md) — отличие `@app/*` от ядра;
- [`rpc-protocol.md`](./rpc-protocol.md) — публичная frontend/backend граница;
- [`system-ping-flow.md`](./system-ping-flow.md) — минимальный vertical slice;
- [`local-development.md`](./local-development.md) — запуск и диагностика;
- [`environment-contract.md`](./environment-contract.md) — runtime settings;
- [`tenant-isolation.md`](./tenant-isolation.md) — mandatory RLS and runtime-role contract;
- [`reference-durable-flow.md`](./reference-durable-flow.md) — executable mutation/outbox proof;
- [`threat-model.md`](./threat-model.md) — assets, trust boundaries and residual responsibilities;
- [`operations-runbook.md`](./operations-runbook.md) — deploy, rollback и incidents;
- [`architecture-change-checklist.md`](./architecture-change-checklist.md) — проверка изменений;
- [`naming-conventions.md`](./naming-conventions.md) — короткие правила именования;
- [`foundation-readiness.md`](./foundation-readiness.md) — что уже проверено;
- [`implementation-roadmap.md`](./implementation-roadmap.md) — выполненный foundation и следующий product stage.
- [`template-lifecycle.md`](./template-lifecycle.md) — snapshot releases and copied-product upgrades.

Долгоживущие решения находятся в [`docs/adr`](../adr). При конфликте документа
с `AGENTS.md` действует ближайший `AGENTS.md`.
