# Local development

## Требования

- Node.js 24
- pnpm 11.7.0 через Corepack
- Docker с Compose plugin

## Быстрый запуск

```bash
pnpm install
cp .env.example .env
docker compose up --detach --wait database
pnpm db:migrate:dev
pnpm dev:demo
```

Compose creates a privileged local migration owner and a separate least-privilege
`app_runtime` role for API/worker. If the database volume predates this role split,
recreate the disposable local volume with `docker compose down --volumes` before
starting it again.

- web: `http://localhost:1420`
- API liveness: `http://localhost:3001/health/live`
- API readiness: `http://localhost:3001/health/ready`
- metrics: `http://localhost:3001/metrics`

`pnpm dev:demo` запускает API и web. Worker при необходимости запускается
отдельно:

```bash
pnpm --filter @app/api worker:dev
```

Native frontend builds require an API URL:

```bash
VITE_API_URL=http://localhost:3001 pnpm build:mobile
VITE_API_URL=http://localhost:3001 pnpm tauri:dev
```

Worker health and metrics are exposed on port `9464`.

## Полный контейнерный путь

```bash
docker compose up --build
docker compose ps
docker compose down --volumes
```

Если порт `3001` занят:

```bash
API_PORT=33001 docker compose up --build
```

## Проверка

```bash
pnpm check
pnpm build
pnpm smoke:api
```

PostgreSQL integration test использует `TEST_DATABASE_URL`. В CI PostgreSQL 17
поднимается автоматически.
