# Product Foundation

Production-oriented и product-neutral основа для создания долгоживущих web,
mobile и desktop-приложений на едином TypeScript-стеке.

[English version](./README.md)

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
- обязательная durable idempotency для mutations;
- global и tenant data scope без фиктивных tenants;
- transactional outbox, retry, dead-letter и retention;
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
pnpm check          # Biome, boundaries, TypeScript и тесты
pnpm build          # production web и API
pnpm smoke:api      # запуск скомпилированного API
pnpm smoke:compose  # PostgreSQL, migrations, API и worker
pnpm check:native   # Capacitor config и Rust/Tauri
```

CI дополнительно запускает PostgreSQL integration tests, Compose smoke и
Tauri build без bundling.

## Начало нового продукта

1. Переименуйте placeholder identifiers и migration namespace.
2. Выберите `DATA_SCOPE_MODE=global` или `tenant`.
3. Добавьте первый contract в `packages/contracts`.
4. Создайте backend capability в `apps/api/src/modules`.
5. Добавьте product migration в `apps/api/migrations`.
6. Создайте первый frontend vertical slice в `packages/frontend-app`.
7. Подключите выбранные identity, permissions, design system и deployment.

Короткое объяснение структуры и правил находится в
[DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md).

## Что намеренно не входит в foundation

- бизнес-логика конкретного продукта;
- identity provider и session model;
- продуктовая permission vocabulary;
- дизайн-система и готовый интерфейс;
- cloud-specific deployment и secrets manager;
- внешние search, queue, storage и realtime-сервисы.

Эти решения добавляются только тогда, когда известны требования продукта.

## Документация

- [Developer guide](./DEVELOPER_GUIDE.md)
- [Architecture overview](./docs/architecture/README.md)
- [Foundation readiness](./docs/architecture/foundation-readiness.md)
- [Architecture decisions](./docs/adr)
- [AI development rules](./AGENTS.md)
