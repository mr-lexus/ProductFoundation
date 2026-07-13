# Runtime environment contract

Configuration is parsed once at process startup. Invalid values stop startup;
feature code must not read `process.env` directly.

| Variable | API | Worker | Default | Notes |
| --- | --- | --- | --- | --- |
| `NODE_ENV` | yes | yes | `development` | `development`, `test`, `production` |
| `DATABASE_URL` | production | required | none | only `postgres://` or `postgresql://` |
| `DATABASE_POOL_MAX` | optional | optional | `10` | budget per process, not per cluster |
| `DATABASE_CONNECTION_TIMEOUT_MS` | optional | optional | `5000` | positive integer |
| `PORT` | optional | no | `3001` | positive integer |
| `CORS_ORIGINS` | production | no | local origins | comma-separated allowlist |
| `MAX_RPC_BODY_BYTES` | optional | no | `1048576` | Fastify body limit |
| `RATE_LIMIT_MAX` | optional | no | `300` | per process/IP window baseline |
| `RATE_LIMIT_WINDOW_MS` | optional | no | `60000` | external store only after multi-replica evidence |
| `TRUST_PROXY` | optional | no | `false` | enable only behind a trusted proxy |
| `LOG_LEVEL` | optional | no | `info` | Pino-compatible level |
| `WORKER_BATCH_SIZE` | no | optional | `50` | claimed in one transaction |
| `WORKER_LEASE_MS` | no | optional | `30000` | must exceed expected handler duration |
| `WORKER_MAX_ATTEMPTS` | no | optional | `10` | then dead-letter |
| `WORKER_POLL_INTERVAL_MS` | no | optional | `1000` | idle delay |

`API_PORT` не читается приложением. Это локальная переменная Docker Compose,
которая публикует container `PORT=3001` на выбранном host-порту и позволяет
параллельно запускать несколько копий болванки без конфликта портов.

Production secrets come from the deployment secret manager. `.env.example` is
only a local template. Dev API/migration/worker commands load a root `.env` when
it exists; production entrypoints do not. Never log database URLs, authorization headers, cookies,
request bodies, note bodies or tokens.
