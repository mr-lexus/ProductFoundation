# Runtime environment contract

Configuration is parsed once at process startup. Invalid values stop startup;
feature code must not read `process.env` directly.

| Variable | Owner | Default | Meaning |
| --- | --- | --- | --- |
| `NODE_ENV` | API/worker | `development` | `development`, `test`, `production` |
| `DATABASE_URL` | API/worker | none | least-privilege runtime connection; required for worker and production API |
| `MIGRATION_DATABASE_URL` | migrate | fallback to `DATABASE_URL` | privileged migration-only connection; do not expose to API/worker |
| `DATABASE_POOL_MAX` | API/worker | `10` | connections per process |
| `DATABASE_CONNECTION_TIMEOUT_MS` | API/worker | `5000` | positive integer |
| `DATA_SCOPE_MODE` | API | `global` | `global` or `tenant` DI capabilities |
| `PRODUCT_MIGRATION_NAMESPACE` | migrate | `app` | stable product migration namespace |
| `PORT` | API | `3001` | API container/process port |
| `CORS_ORIGINS` | API | local origins | required in production |
| `MAX_RPC_BODY_BYTES` | API | `1048576` | Fastify body limit |
| `RATE_LIMIT_MAX` | API | `300` | per-process/IP baseline |
| `RATE_LIMIT_WINDOW_MS` | API | `60000` | rate-limit window |
| `TRUST_PROXY` | API | `false` | enable only behind a trusted proxy |
| `LOG_LEVEL` | API | `info` | Pino-compatible level |
| `WORKER_BATCH_SIZE` | worker | `10` | maximum concurrently claimed/delivered messages, range 1..50 |
| `WORKER_LEASE_MS` | worker | `30000` | delivery lease |
| `WORKER_MAX_ATTEMPTS` | worker | `10` | attempts before dead letter |
| `WORKER_POLL_INTERVAL_MS` | worker | `1000` | idle/error retry delay |
| `WORKER_METRICS_PORT` | worker | `9464` | health and Prometheus port |
| `WORKER_MAINTENANCE_INTERVAL_MS` | worker | `30000` | stats/cleanup interval |
| `WORKER_CLEANUP_BATCH_SIZE` | worker | `500` | retention delete batch |
| `WORKER_PROCESSED_RETENTION_MS` | worker | `604800000` | processed row retention |
| `WORKER_DEAD_LETTER_RETENTION_MS` | worker | `2592000000` | dead-letter retention |

Compose-only variables:

- `API_PORT` publishes API port `3001` on a chosen host port;
- `DATABASE_PORT` publishes PostgreSQL port `5432` on a chosen host port;
- `COMPOSE_PROJECT_NAME` isolates containers and volumes between copied projects.

Frontend build variables:

- `VITE_API_URL` is optional for web (same-origin production default) and required
  for mobile/desktop;
- `VITE_APP_PLATFORM` and `VITE_APP_TITLE` are set by the platform build script.

Production secrets come from the deployment secret manager. `.env.example` is
only a local template. Never log database URLs, authorization headers, cookies,
request bodies, document contents or tokens.
