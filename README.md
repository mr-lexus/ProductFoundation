# Product Foundation Starter

Нейтральная TypeScript-база для запуска web, mobile и desktop продуктов с одним
общим frontend и NestJS/PostgreSQL backend.

В репозитории уже настроены RPC-контракты, транзакции, миграции, tenant/auth
boundaries, outbox worker, конфигурация, security baseline, health, метрики,
Docker и CI. Продуктовой логики и дизайн-системы здесь нет.

## Начать работу

```bash
pnpm install
cp .env.example .env
docker compose up --detach --wait database
pnpm db:migrate:dev
pnpm dev:demo
```

Web: `http://localhost:1420`. API: `http://localhost:3001`.

Перед первой продуктовой задачей прочитайте
[DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md). Там простым языком описано, что где
лежит и куда добавлять новый код.

## Главные команды

```bash
pnpm dev:demo       # API + web
pnpm check          # границы, TypeScript и тесты
pnpm build          # production build
pnpm smoke:api      # запуск собранного API
docker compose up --build
```

Подробные решения находятся в [docs/architecture](./docs/architecture) и
[docs/adr](./docs/adr). Правила для AI-агентов находятся в `AGENTS.md`.
