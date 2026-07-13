# Foundation implementation roadmap

Этот roadmap относится только к технической болванке. Product roadmap, UI и
design system создаются после копирования репозитория.

## Выполнено

### Architecture boundaries

- modular monolith;
- нейтральные `@product-foundation/*` и заменяемые `@app/*` packages;
- NestJS/Fastify только на composition/transport edge;
- frontend FSD dependency direction;
- автоматический architecture gate.

### Contracts и runtime

- versioned contract-first RPC;
- общий envelope, errors, request ID и cancellation;
- Zod input/output validation;
- native ESM production build и compiled smoke test.

### Data и reliability

- PostgreSQL pool, transactions и readiness;
- immutable namespaced SQL migrations с checksums/advisory lock;
- explicit tenant scope и deny-by-default authorization boundary;
- idempotency ledger, transactional outbox и отдельный worker;
- retry, lease, dead-letter и graceful shutdown.

### Security и operations

- validated environment contract;
- Helmet, CORS, body/rate limits;
- redacted JSON logs, health и Prometheus metrics;
- Dockerfile, Compose, GitHub Actions, rollback/backup/incident runbooks.

### Neutral starter

- удалена привязка к конкретной предметной области;
- product namespace заменён на `@app/*`;
- оставлен только технический `system-ping` vertical slice;
- добавлен человеческий `DEVELOPER_GUIDE.md`;
- документация сокращена до актуального состояния.

## Следующий этап выполняется в конкретном продукте

1. Переименовать placeholder identifiers.
2. Выбрать identity/session model и permission vocabulary.
3. Создать первый product contract и backend capability.
4. Добавить product migrations в отдельном namespace.
5. Создать design system и первый frontend vertical slice.
6. Добавить product-specific tenant isolation и authorization tests.
7. Настроить deployment secrets, ingress и telemetry exporter.

## Не добавлять заранее

Microservices, Redis, external queue/search, CRDT, event bus и distributed
tracing backend добавляются только по измеренной необходимости и через ADR.
