# Путеводитель разработчика

[English version](./DEVELOPER_GUIDE.md)

## Что это

Это нейтральная техническая основа продукта. Репозиторий содержит общий frontend, NestJS API,
RPC, PostgreSQL, worker, проверки, Docker и CI. Предметной области, готовой авторизации и
дизайн-системы здесь намеренно нет.

## Что где лежит

```text
apps/
  api/          NestJS composition, продуктовые backend-модули и worker
  web/          Vite-сборка общего frontend
  mobile/       Capacitor shell
  desktop/      Tauri shell

packages/
  contracts/          продуктовые Zod/RPC-контракты
  frontend-app/       общий React frontend
  rpc/                формат RPC-протокола
  rpc-client/         RPC-клиент
  rpc-server/         валидация и выполнение RPC
  backend-core/       ports, operation scope, idempotency и outbox orchestration
  backend-postgres/   PostgreSQL-адаптеры и foundation migrations
  config/             общие настройки инструментов
```

`@product-foundation/*` — нейтральное техническое ядро, `@app/*` — заменяемый продуктовый слой.

## Как начать новый продукт

1. Переименуйте placeholder identifiers.
2. Выберите `DATA_SCOPE_MODE=global` или `tenant`.
3. Выберите identity/session model и permission vocabulary.
4. Создайте контракт в `packages/contracts`.
5. Создайте backend capability в `apps/api/src/modules/<name>`.
6. Добавьте product migration в `apps/api/migrations`.
7. Создайте frontend slice в `packages/frontend-app/src`.
8. Выполните относящиеся к изменению acceptance checks.

## Durable RPC mutations

Каждая mutation требует `X-Idempotency-Key` и invoker из
`apps/api/src/shared/application/create-idempotent-rpc-handler-invoker.ts`.

Mutation handler получает `context.execution.transaction`. Все изменения PostgreSQL и outbox
append обязаны использовать именно этот executor. Invoker валидирует публичный output,
завершает idempotency record и фиксирует все эффекты одной транзакцией. Ошибка handler-а или
output validation откатывает state, outbox и ledger вместе.

Не открывайте вложенную транзакцию внутри mutation handler. Внешние side effects оформляйте
как outbox event и обрабатывайте идемпотентным worker handler.

## Global и tenant продукты

`DATA_SCOPE_MODE=global` экспортирует обычные SQL/transaction ports.

`DATA_SCOPE_MODE=tenant` экспортирует product modules только `TenantTransactionRunner`, который
устанавливает transaction-local `app.tenant_id`. Это ещё не полноценная изоляция: каждая
tenant-owned таблица обязана включать и принудительно применять RLS, иметь явную policy,
работать под non-superuser ролью и проходить негативные cross-tenant tests. См.
[tenant isolation contract](./docs/architecture/tenant-isolation.md).

## PostgreSQL и worker

- Foundation migrations находятся в `packages/backend-postgres/migrations`.
- Product migrations находятся в `apps/api/migrations`.
- Применённые миграции неизменяемы и защищены checksum.
- State и outbox event записываются одной транзакцией.
- Все сообщения claim-а начинают обработку одновременно, чтобы lease не истекал в локальной очереди.
- Outbox handlers остаются идемпотентными: доставка имеет семантику at least once.

## Frontend и платформы

```text
app → pages → widgets → features → entities → shared
```

HTTP/RPC находится в `shared/api`, server state — в TanStack Query, локальное состояние — в
React. Web production использует same-origin API; для Capacitor и Tauri обязателен
`VITE_API_URL`.

## Что переименовать

- `product-foundation-starter` — имя репозитория/root package;
- `Product Starter` — title приложений;
- `com.example.product` — Capacitor/Tauri identifiers;
- `app` — migration namespace, PostgreSQL names и metric prefix;
- `@app/*` — только если нужен собственный namespace.

## Проверки

```bash
pnpm check
pnpm build
pnpm smoke:api
pnpm smoke:compose
pnpm check:native
```

PostgreSQL integration tests требуют `TEST_DATABASE_URL` и запускаются в CI. Скопированный
продукт не готов к трафику, пока не выполнены продуктовые требования из `README.md` и
`SECURITY.md`.
