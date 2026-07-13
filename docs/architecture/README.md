# Architecture documentation

Начните с корневого [`DEVELOPER_GUIDE.md`](../../DEVELOPER_GUIDE.md).

- [`target-architecture.md`](./target-architecture.md) — runtimes, dependency flow и data boundaries;
- [`monorepo-layout.md`](./monorepo-layout.md) — владелец каждого каталога;
- [`where-to-put-code.md`](./where-to-put-code.md) — куда положить новый файл;
- [`foundation-boundaries.md`](./foundation-boundaries.md) — отличие `@app/*` от ядра;
- [`rpc-protocol.md`](./rpc-protocol.md) — публичная frontend/backend граница;
- [`system-ping-flow.md`](./system-ping-flow.md) — минимальный vertical slice;
- [`local-development.md`](./local-development.md) — запуск и диагностика;
- [`environment-contract.md`](./environment-contract.md) — runtime settings;
- [`operations-runbook.md`](./operations-runbook.md) — deploy, rollback и incidents;
- [`architecture-change-checklist.md`](./architecture-change-checklist.md) — проверка изменений;
- [`naming-conventions.md`](./naming-conventions.md) — короткие правила именования;
- [`foundation-readiness.md`](./foundation-readiness.md) — что уже проверено;
- [`implementation-roadmap.md`](./implementation-roadmap.md) — выполненный foundation и следующий product stage.

Долгоживущие решения находятся в [`docs/adr`](../adr). При конфликте документа
с `AGENTS.md` действует ближайший `AGENTS.md`.
