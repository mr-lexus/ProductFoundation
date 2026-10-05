# Локальная разработка

[English version](./local-development.md)

## Требования

- Node.js 24
- pnpm 11.7.0 через Corepack
- Docker с плагином Compose

## Быстрый запуск

```bash
pnpm install
cp .env.example .env
docker compose up --detach --wait database
pnpm db:migrate:dev
pnpm dev:demo
```

Compose создаёт привилегированного владельца миграций и отдельную роль
`app_runtime` с минимальными правами для API и фонового процесса. Если локальный
том базы был создан до разделения ролей, пересоздайте его командой
`docker compose down --volumes` перед повторным запуском. Это удалит
локальные данные тома.

- Web: `http://localhost:1420`
- Проверка работы API: `http://localhost:3001/health/live`
- Проверка готовности API: `http://localhost:3001/health/ready`
- Метрики: `http://localhost:3001/metrics`

`pnpm dev:demo` запускает API и Web. Фоновый процесс при необходимости
запускается отдельно:

```bash
pnpm --filter @app/api worker:dev
```

Сборкам нативного фронтенда нужен URL API:

```bash
NATIVE_ALLOW_INSECURE_API=true VITE_API_URL=http://localhost:3001 pnpm build:mobile:dev
VITE_API_URL=http://localhost:3001 pnpm tauri:dev
```

Автоматическая перезагрузка Capacitor включается явно и только для разработки:

```bash
VITE_API_URL=https://api.example.com CAP_LIVE_RELOAD=true CAP_SERVER_URL=http://192.168.1.10:1421 pnpm cap:sync:dev android
```

Рабочие нативные сборки требуют HTTPS в `VITE_API_URL`. Обёртка Tauri формирует
дополнение CSP с точным origin из этого URL. В базовой CSP репозитория нет
сетевых разрешений с подстановками.

Проверки состояния и метрики фонового процесса доступны на порту `9464`.

## Команды фронтенда и оболочек

Задайте имя и идентификаторы продукта до `cap:add:android` или `cap:add:ios`.
Сгенерированные нативные проекты не отслеживаются Git, а cap sync
не переименовывает их. Если они уже существуют, команда переименования
откажется записывать изменения, чтобы не оставить старые bundle ID.
Необязательный `--short-name` задаёт только короткое имя манифеста Web;
по умолчанию оно равно `--name`.

| Команда | Назначение |
| --- | --- |
| pnpm build:web | Рабочая сборка Web/PWA в apps/web/dist |
| pnpm build:mobile | Рабочая сборка мобильного фронтенда в apps/mobile/dist |
| pnpm build:mobile:dev | Явная сборка Mobile для разработки; можно отдельно разрешить локальный HTTP |
| pnpm build:desktop:frontend | Рабочая сборка фронтенда Desktop в apps/desktop/dist |
| pnpm build:frontends | Один раз собрать общие зависимости, затем параллельно все три фронтенда |
| pnpm dev:mobile:frontend | Vite для Mobile на 127.0.0.1:1421; --host открывает доступ из локальной сети |
| pnpm dev:desktop:frontend | Vite для Desktop на 127.0.0.1:1422 |
| pnpm cap:sync [android\|ios] | Рабочая сборка и синхронизация Capacitor |
| pnpm cap:sync:dev [android\|ios] | Локальная сборка и синхронизация для разработки |
| pnpm check:frontend-artifacts | Проверить готовые сборки и фактическую конфигурацию Vite |
| pnpm test:frontend-artifacts | Пересобрать и проверить изоляцию последовательных и параллельных сборок |
| pnpm --filter @app/web test:pwa | Собрать Web с API на том же origin и выполнить три браузерных smoke-теста |

Web остаётся на порту 1420. Порты предварительного просмотра — 4173, 4174
и 4175 соответственно. Фиксированные порты не позволяют нативной странице
разработки случайно разделить origin с service worker Web.
В Desktop `check` по-прежнему запускает Cargo, в Mobile — проверяет
конфигурацию Capacitor. Для обоих добавлен `check:frontend`.
Команды Desktop `dev` и `build` остаются нативными операциями Tauri.

Установите тестовый браузер командой
`pnpm --filter @app/web exec playwright install chromium`
(в Linux CI добавьте `--with-deps`). Если загрузка недоступна, но Chrome уже
установлен, `PLAYWRIGHT_CHANNEL=chrome` выберет его с отдельным временным
профилем. Smoke-тест не использует профиль пользователя и не требует бэкенда
или базы данных.

В PowerShell переменные окружения задаются иначе, чем в примерах Bash:

```powershell
$env:VITE_API_URL = 'https://api.example.com'
pnpm build:frontends
pnpm check:frontend-artifacts
```

## Запуск в контейнерах

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

Если Node/pnpm работает в Windows, а Docker доступен только внутри WSL,
используйте `COMPOSE_DOCKER_VIA_WSL=true pnpm smoke:compose`.
В Linux и CI вызывается `docker` напрямую; обычный Docker Desktop
для Windows автоматически использует `docker.exe`.

Интеграционные тесты PostgreSQL используют `TEST_DATABASE_URL`.
В CI PostgreSQL 17 запускается автоматически.
