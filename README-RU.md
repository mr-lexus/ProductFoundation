# Product Foundation

Production-oriented и product-neutral основа для создания долгоживущих web,
mobile и desktop-приложений на едином TypeScript-стеке.

[English version](./README.md)

**Статус:** production-oriented public beta. Foundation спроектирован для production-сценариев,
но остаётся beta до публикации reference durable flow и прохождения всех acceptance jobs в
публичном репозитории. Скопированный продукт всё равно должен завершить продуктовый
security/operations checklist до запуска реального трафика.

## Что это

Product Foundation — универсальный монорепозиторий для запуска нескольких
продуктов на едином стеке. Он предоставляет архитектурные границы, готовые
runtime-оболочки и базовые механизмы надёжности, но не навязывает предметную
область, дизайн-систему или провайдера аутентификации.

Это не коллекция случайно установленных библиотек и не готовый SaaS-продукт.
Это техническая основа: копируем репозиторий, добавляем продуктовый слой и
начинаем разработку.

## Что уже настроено

- единый React frontend для browser, Capacitor и Tauri;
- NestJS + Fastify backend;
- PostgreSQL и версионируемые SQL-миграции;
- contract-first RPC с runtime-валидацией через Zod;
- транзакционно-атомарная PostgreSQL idempotency для mutations;
- global scope либо tenant execution context с обязательной проверкой forced RLS;
- transactional outbox, retry, dead-letter и retention;
- исполняемый durable reference mutation, проверяемый по HTTP и в Compose;
- отдельный background worker с health checks и Prometheus metrics;
- request ID, CORS, Helmet, rate/body limits и безопасные логи;
- Biome, TypeScript, unit/integration tests и architecture gates;
- production Docker image, Docker Compose smoke и GitHub Actions;
- правила для AI-агентов и документация для разработчиков.

## Архитектурная модель

```text
apps/                         runtime и composition
  api/                        NestJS API, product modules, worker
  web/                        browser shell
  mobile/                     Capacitor shell
  desktop/                    Tauri shell

packages/                     переиспользуемый код
  contracts/                  product RPC schemas и DTO
  frontend-app/               общее React-приложение
  rpc/                        framework-neutral RPC protocol
  rpc-client/                 framework-neutral RPC client
  rpc-server/                 framework-neutral RPC executor
  backend-core/               backend ports и durable orchestration
  backend-postgres/           PostgreSQL adapters и foundation migrations
  config/                     общие настройки инструментов
```

`@product-foundation/*` — нейтральное техническое ядро. Оно не зависит от
продуктового кода.

`@app/*` — заменяемый слой конкретного продукта: contracts, UI, backend
capabilities и конфигурация.

Web, mobile и desktop используют одно приложение из `frontend-app`.
Platform-specific код остаётся в тонких runtime-оболочках.

## Быстрый запуск

Требования:

- Node.js 24;
- pnpm 11.7.0;
- PostgreSQL 17 или Docker для локальной базы.

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

## Проверка репозитория

```bash
pnpm check          # детерминированные static checks и unit tests
TEST_DATABASE_URL=postgresql://... pnpm check:ci # плюс PostgreSQL integration tests
pnpm build          # production web и API
pnpm smoke:api      # запуск скомпилированного API
pnpm smoke:compose  # PostgreSQL, migrations, API и worker
pnpm check:native   # Capacitor config и Rust/Tauri
```

CI дополнительно запускает PostgreSQL integration tests, Compose smoke и
Tauri build без bundling. Pull requests проходят dependency review, CodeQL
запускается для pushes/PRs и еженедельно, а Dependabot обновляет npm, Cargo и Actions refs.

## Начало нового продукта

1. Просмотрите и примените безопасную rename-команду из путеводителя разработчика.
2. Выберите `DATA_SCOPE_MODE=global` или `tenant`.
3. Добавьте первый contract в `packages/contracts`.
4. Создайте backend capability в `apps/api/src/modules`.
5. Добавьте product migration в `apps/api/migrations`.
6. Создайте первый frontend vertical slice в `packages/frontend-app`.
7. Подключите выбранные identity, permissions, design system и deployment.

Для tenant-продукта обязателен
[tenant isolation contract](./docs/architecture/tenant-isolation.md). Tenant context сам по
себе не является изоляцией: каждая tenant-owned таблица должна принудительно включать RLS и
иметь негативные cross-tenant tests.

Короткое объяснение структуры и правил находится в
[DEVELOPER_GUIDE-RU.md](./DEVELOPER_GUIDE-RU.md).

## Что намеренно не входит в foundation

- бизнес-логика конкретного продукта;
- identity provider и session model;
- продуктовая permission vocabulary;
- дизайн-система и готовый интерфейс;
- cloud-specific deployment и secrets manager;
- внешние search, queue, storage и realtime-сервисы.

Эти решения добавляются только тогда, когда известны требования продукта.

## Production boundary

Foundation готов к копированию и расширению, но скопированное приложение не становится
production-ready только из-за прохождения foundation checks. До реального трафика продукт
должен завершить identity/session model, authorization rules, threat model, tenant policies,
secret management, deployment isolation, alerts, backup/restore drill и продуктовые
integration tests.

## Документация

- [Путеводитель разработчика](./DEVELOPER_GUIDE-RU.md)
- [Architecture overview](./docs/architecture/README.md)
- [Foundation readiness](./docs/architecture/foundation-readiness.md)
- [Executable durable reference flow](./docs/architecture/reference-durable-flow.md)
- [Threat model](./docs/architecture/threat-model.md)
- [Architecture decisions](./docs/adr)
- [AI development rules](./AGENTS.md)
- [Contributing](./CONTRIBUTING.md)
- [Security policy](./SECURITY.md)
- [MIT license](./LICENSE)
