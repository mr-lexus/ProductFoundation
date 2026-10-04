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
NATIVE_ALLOW_INSECURE_API=true VITE_API_URL=http://localhost:3001 pnpm build:mobile:dev
VITE_API_URL=http://localhost:3001 pnpm tauri:dev
```

Capacitor live reload is opt-in and development-only:

```bash
VITE_API_URL=https://api.example.com CAP_LIVE_RELOAD=true CAP_SERVER_URL=http://192.168.1.10:1421 pnpm cap:sync:dev android
```

Production native builds require an HTTPS `VITE_API_URL`. The Tauri wrapper derives an
exact-origin CSP override from that URL; the checked-in base CSP has no wildcard network source.

Worker health and metrics are exposed on port `9464`.

## Frontend runtime commands

Initialize product identity before cap:add:android or cap:add:ios. Generated native
projects are ignored by Git and are not renamed by cap sync. The rename command
refuses writes when those projects exist, rather than leaving stale bundle IDs.
An optional --short-name sets only the Web manifest short name; it defaults to --name.

| Command | Meaning |
| --- | --- |
| pnpm build:web | Production Web/PWA, apps/web/dist |
| pnpm build:mobile | Production mobile frontend, apps/mobile/dist |
| pnpm build:mobile:dev | Explicit development mobile build; local HTTP opt-in allowed |
| pnpm build:desktop:frontend | Production desktop frontend, apps/desktop/dist |
| pnpm build:frontends | Build shared dependencies once, then all frontend runtimes concurrently |
| pnpm dev:mobile:frontend | Mobile Vite server on 127.0.0.1:1421; pass --host for LAN live reload |
| pnpm dev:desktop:frontend | Desktop Vite server on 127.0.0.1:1422 |
| pnpm cap:sync [android\|ios] | Production build and Capacitor sync |
| pnpm cap:sync:dev [android\|ios] | Explicit local development build and sync |
| pnpm check:frontend-artifacts | Inspect existing outputs and effective Vite configuration |
| pnpm test:frontend-artifacts | Rebuild and prove sequential/concurrent output isolation |
| pnpm --filter @app/web test:pwa | Build same-origin production Web and run three browser smoke tests |

Web stays on port 1420. Preview ports are 4173/4174/4175 respectively. Strict ports
prevent a native development page from accidentally sharing a Web worker origin.
Desktop check remains Cargo; mobile check remains Capacitor configuration checking.
Both add check:frontend. Desktop dev/build remain native Tauri operations.

Install the test browser with pnpm --filter @app/web exec playwright install chromium
(add --with-deps on Linux CI). If the download is unavailable and Chrome is already
installed, PLAYWRIGHT_CHANNEL=chrome selects it using an isolated temporary profile.
Browser smoke does not use a user's profile or require a backend/database.

PowerShell environment syntax differs from the Bash examples:

```powershell
$env:VITE_API_URL = 'https://api.example.com'
pnpm build:frontends
pnpm check:frontend-artifacts
```

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

If Node/pnpm runs on Windows while Docker is exposed only inside WSL, use
`COMPOSE_DOCKER_VIA_WSL=true pnpm smoke:compose`. Linux and CI use `docker` directly;
ordinary Docker Desktop for Windows uses `docker.exe` automatically.

PostgreSQL integration test использует `TEST_DATABASE_URL`. В CI PostgreSQL 17
поднимается автоматически.
