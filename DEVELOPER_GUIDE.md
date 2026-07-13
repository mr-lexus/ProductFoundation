# Путеводитель разработчика

## Что это

Это готовая техническая основа продукта. Репозиторий копируется целиком, после
чего команда добавляет свою предметную область, интерфейс и интеграции.

Здесь намеренно нет готовой авторизации, дизайн-системы и бизнес-сущностей:
они зависят от конкретного продукта. При этом места их подключения и безопасные
границы уже подготовлены.

## Карта репозитория

```text
apps/
  api/          NestJS API, worker и сборка backend-модулей
  web/          запуск общего frontend в браузере
  mobile/       Capacitor shell для iOS и Android
  desktop/      Tauri shell

packages/
  contracts/            публичные схемы и DTO конкретного продукта
  frontend-app/         общий React frontend для всех платформ
  rpc/                  формат RPC-протокола
  rpc-client/           нейтральный RPC-клиент
  rpc-server/           выполнение и валидация RPC на сервере
  backend-core/         интерфейсы auth, tenancy, transactions и outbox
  backend-postgres/     PostgreSQL-адаптеры и foundation migrations
  config/               общие настройки TypeScript и инструментов

docs/
  adr/           почему приняты долгоживущие решения
  architecture/  подробное устройство и эксплуатация
```

`apps/*` запускают приложение. `packages/*` содержат код, который они собирают.
Runtime shells должны оставаться тонкими.

## Куда добавлять backend-функцию

Создайте capability в `apps/api/src/modules/<name>`:

```text
contract/       связь с публичным контрактом
domain/         чистые бизнес-правила без NestJS и базы
application/    use cases, permissions и транзакции
transport/      тонкий NestJS controller и DI composition
```

Порядок работы:

1. Добавьте Zod contract в `packages/contracts`.
2. Напишите domain-правила и use case.
3. Подключите репозиторий через application port.
4. Добавьте SQL в отдельную product migration directory и используйте стабильный
   namespace продукта. Foundation migrations не редактируйте.
5. Подключите use case тонким RPC controller.
6. Зарегистрируйте Nest module в `apps/api/src/app/app.module.ts`.
7. Добавьте domain/application tests и boundary test.

Направление зависимостей: `transport → application → domain`. Обратные импорты
запрещены. NestJS, Fastify и `pg` не должны попадать в domain/application.

## Куда добавлять frontend-функцию

Общий frontend находится в `packages/frontend-app/src`:

```text
app → pages → widgets → features → entities → shared
```

Импортировать можно только вправо по этой цепочке. Например, `features` может
использовать `entities` и `shared`, но `entities` не может импортировать feature.

- `pages` собирают экран;
- `widgets` собирают большие блоки экрана;
- `features` реализуют действия пользователя;
- `entities` содержат продуктовые модели и правила;
- `shared` содержит только UI/API/config/lib без бизнес-смысла.

HTTP/RPC вызовы размещайте в `shared/api`, server state — в TanStack Query,
локальное состояние компонента — в React. Zustand нужен только для действительно
общего долгоживущего client state.

Не копируйте feature в `apps/web`, `apps/mobile` и `apps/desktop`. Эти каталоги
только запускают общий frontend и подключают возможности платформы.

## Contracts и RPC

Публичная схема frontend/backend лежит в `packages/contracts`. Она содержит Zod
input/output schemas и procedure definition, но не бизнес-сервисы и не database
models. API и frontend импортируют один контракт, поэтому несовместимая форма
ловится при сборке и runtime-валидации.

`system-ping` — технический сквозной пример. Он показывает полный путь запроса и
может быть удалён, когда первый продуктовый RPC покрывает тот же путь тестом.

## PostgreSQL и фоновые задачи

- `packages/backend-postgres/migrations` содержит только неизменяемые foundation
  migrations: idempotency и outbox.
- Product migrations храните отдельно и запускайте после foundation migrations.
- Каждому продукту нужен собственный migration namespace.
- Tenant-owned запросы выполняйте через `TenantTransactionRunner`.
- Изменение состояния и запись outbox event должны быть одной транзакцией.
- Worker запускается отдельно командой `pnpm --filter @app/api worker`.

## Что переименовать после копирования

Минимально замените:

- `product-foundation-starter` — имя репозитория и Compose project;
- `@app/*` — при необходимости на namespace команды/продукта;
- `Product Starter` — title web/mobile/desktop;
- `com.example.product` — Capacitor и Tauri identifiers;
- `app` — локальные имя/пользователь PostgreSQL;
- `app_*` — prefix метрик.

`@product-foundation/*` можно оставить: это внутреннее техническое ядро workspace.

## Проверка перед завершением задачи

```bash
pnpm check
pnpm build
pnpm smoke:api
```

Если менялись PostgreSQL, Docker или startup configuration, дополнительно:

```bash
docker compose up --build
curl http://localhost:3001/health/ready
docker compose down --volumes
```

Не утверждайте, что изменение готово, если соответствующая проверка не была
запущена. Более строгие правила для конкретных каталогов находятся в ближайших
`AGENTS.md`.
