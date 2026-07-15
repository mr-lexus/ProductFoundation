# Путеводитель разработчика

## Что это

Это нейтральная техническая основа продукта. Репозиторий копируется целиком и
уже содержит общий frontend, NestJS API, RPC, PostgreSQL, worker, проверки,
Docker и CI. Предметной области, готовой авторизации и дизайн-системы здесь нет.

## Что где лежит

```text
apps/
  api/          NestJS composition, продуктовые backend-модули и worker
  web/          Vite-сборка общего frontend
  mobile/       Capacitor shell
  desktop/      Tauri shell

packages/
  contracts/          продуктовые Zod/RPC-контракты
  frontend-app/       общий React frontend для всех платформ
  rpc/                формат RPC-протокола
  rpc-client/         RPC-клиент
  rpc-server/         валидация и выполнение RPC
  backend-core/       auth/scope ports, idempotency и outbox orchestration
  backend-postgres/   PostgreSQL-адаптеры и foundation migrations
  config/             общие настройки инструментов

docs/adr/             почему приняты долгоживущие решения
docs/architecture/    устройство и эксплуатация
```

Правило простое: `apps/*` запускают систему, `packages/*` содержат общий код.
Foundation-пакеты не импортируют `@app/*`.

## Как начать новый продукт

1. Переименуйте placeholder identifiers из раздела ниже.
2. Выберите `DATA_SCOPE_MODE=global` или `tenant`.
3. Выберите identity/session model и permission vocabulary.
4. Создайте первый контракт в `packages/contracts`.
5. Создайте backend capability в `apps/api/src/modules/<name>`.
6. Добавьте первую SQL-миграцию в `apps/api/migrations`.
7. Создайте frontend slice в `packages/frontend-app/src`.
8. Выполните `pnpm check`, `pnpm build` и `pnpm smoke:compose`.

## Backend capability

```text
apps/api/src/modules/<name>/
  contract/       связь с публичным контрактом
  domain/         чистые бизнес-правила
  application/    use cases, permissions, ports и транзакции
  infrastructure/ product repository adapters, если нужны
  transport/      тонкие NestJS controllers и module composition
```

Зависимости идут внутрь: `transport/infrastructure → application → domain`.
Domain и application не импортируют NestJS, Fastify или `pg`.

Порядок добавления RPC:

1. Создать Zod input/output и procedure contract.
2. Написать domain/application код и тесты.
3. Подключить repository через application port.
4. Создать тонкий NestJS controller.
5. Зарегистрировать module в `AppModule`.

Все RPC mutations обязаны передавать в `executeRpcProcedure` invoker из
`apps/api/src/shared/application/create-idempotent-rpc-handler-invoker.ts`.
Executor требует `X-Idempotency-Key`, проверяет payload hash, lease ownership и
возвращает сохранённый результат при повторе. Mutation без durable invoker
завершается ошибкой и не вызывает handler.

Синхронный handler должен укладываться в настроенный idempotency lease. Долгую
работу оформляйте как короткую транзакцию + outbox event, а не держите RPC и
lease открытыми минутами.

## Global и tenant продукты

`DATA_SCOPE_MODE=global` подходит продукту с общей схемой данных. Product modules
получают обычные `SqlExecutor` и `TransactionRunner`.

`DATA_SCOPE_MODE=tenant` включает изоляцию арендаторов. Product modules получают
только `TenantTransactionRunner`; он устанавливает transaction-local
`app.tenant_id`. Tenant-owned repository принимает явный `TenantScope`.

Idempotency, outbox и audit используют `OperationScope`: `global` либо `tenant`.
Поэтому простой продукт не создаёт фиктивный tenant.

## PostgreSQL и worker

- `packages/backend-postgres/migrations` — неизменяемые foundation migrations.
- `apps/api/migrations` — готовое место product migrations.
- `PRODUCT_MIGRATION_NAMESPACE` — стабильный namespace продукта.
- Foundation migrations всегда выполняются раньше product migrations.
- State change и outbox event записываются одной транзакцией.
- Worker имеет lease/retry/dead-letter, retention cleanup, health и Prometheus.
- Worker health: `:9464/health/ready`; metrics: `:9464/metrics`.

## Frontend и платформы

Общий frontend находится в `packages/frontend-app/src`:

```text
app → pages → widgets → features → entities → shared
```

Импортировать можно только вправо. HTTP/RPC находится в `shared/api`, server
state — в TanStack Query, локальное состояние — в React. Router или Zustand
добавляются тогда, когда появляется реальная задача для них.

Web production по умолчанию использует same-origin API. Для Capacitor и Tauri
`VITE_API_URL` обязателен. Platform build передаёт `web`, `mobile` или `desktop`
в общий frontend; отдельные копии UI не создаются.

```bash
pnpm build:web
VITE_API_URL=https://api.example.com pnpm build:mobile
VITE_API_URL=https://api.example.com pnpm tauri:build
```

## Что переименовать после копирования

- `product-foundation-starter` — имя репозитория и корневого npm package;
- `Product Starter` — title приложений;
- `com.example.product` — Capacitor/Tauri identifiers;
- `app` — product migration namespace, PostgreSQL names и metric prefix;
- `@app/*` — только если команде нужен собственный package namespace.

`@product-foundation/*` можно оставить: это внутреннее техническое ядро.

## Главные проверки

```bash
pnpm check          # Biome, architecture, TypeScript и тесты
pnpm check:native   # Capacitor config и cargo check
pnpm build          # production web/API build
pnpm smoke:api      # запуск compiled API
pnpm smoke:compose  # DB + migrations + API + worker
```

PostgreSQL integration test запускается автоматически в CI через
`TEST_DATABASE_URL`. Не объявляйте изменение готовым, если относящаяся к нему
проверка не выполнена.
