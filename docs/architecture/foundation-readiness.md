# Foundation readiness

## Статус

Болванка готова для копирования и начала продуктовой разработки. Она не содержит
готовую дизайн-систему, identity provider или предметную область.

## Проверяемые возможности

- architecture gate для всех `apps` и `packages`;
- native ESM build foundation contracts и API;
- NestJS 11 + Fastify 5;
- versioned contract-first RPC с runtime validation;
- PostgreSQL 17 migrations с checksum, advisory lock и namespaces;
- transactions, tenant context, deny-by-default authorization boundary;
- idempotency ledger, transactional outbox и отдельный worker;
- security headers, CORS, body/rate limits и redacted structured logs;
- liveness, readiness, Prometheus metrics и graceful shutdown;
- production web/API build, Docker image, Compose и CI.

## Осознанно не выбрано

Следующие решения принимает конкретный продукт:

- identity provider и session/token model;
- permission vocabulary;
- product database schema;
- дизайн-система и UI;
- search, realtime, queue и object storage providers;
- deployment platform и telemetry exporter.

Добавлять Redis, отдельные сервисы, CRDT или внешний search заранее запрещено:
сначала должна появиться измеренная необходимость и ADR.
