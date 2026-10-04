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
- `COMPOSE_DOCKER_VIA_WSL=true` makes the Windows smoke runner invoke Docker through
  `wsl.exe`; it is a local toolchain compatibility switch, not runtime configuration.

Frontend build variables:

- Web uses VITE_API_URL when supplied, localhost:3001 during development, and
  same-origin production otherwise. Its usual Vite environment-file behavior remains.
- Mobile/desktop require an exact VITE_API_URL from the shell/CI environment.
  Native Vite configuration validates and embeds that exact value; native .env files
  cannot replace it. Production and CI require HTTPS, with no CI fallback.
- Local desktop development permits HTTP. Local mobile development requires
  NATIVE_ALLOW_INSECURE_API=true with build:mobile:dev or cap:sync:dev.
  This flag is rejected for production or CI.
  Development Capacitor sync forwards the HTTP opt-in to Android cleartext/mixed-content
  settings; production sync removes it. iOS ATS/device behavior still requires verification
  on a Mac/device; HTTPS is the portable development option.
- Live reload requires cap:sync:dev, CAP_LIVE_RELOAD=true and CAP_SERVER_URL together.
  Production sync and CI reject it. CAP_SERVER_URL is an exact HTTP(S) origin.
- Platform identity is a shell literal. VITE_APP_PLATFORM and VITE_APP_TITLE are removed.

## Effective frontend origins

| Runtime | Origin with checked-in configuration |
| --- | --- |
| Web development | http://127.0.0.1:1420 (localhost also accepted by the development API) |
| Capacitor live reload | Exact CAP_SERVER_URL, normally LAN host on port 1421 |
| Tauri development, all desktop OSes | http://127.0.0.1:1422 |
| Packaged Capacitor iOS | capacitor://localhost |
| Packaged Capacitor Android | https://localhost |
| Packaged Tauri Windows | http://tauri.localhost |
| Packaged Tauri macOS/Linux | tauri://localhost |
| Deployed Web/PWA | Its deployed HTTP(S) origin; HTTPS is required for production PWA |

Capacitor hostname/schemes and Tauri useHttpsScheme=false are explicit and checked.
The mappings were verified against the installed Capacitor 8.4.1 configuration
and Tauri 2.11.5 protocol mapping; see [Capacitor configuration](https://capacitorjs.com/docs/config)
and [the locked Tauri implementation](https://github.com/tauri-apps/tauri/blob/tauri-v2.11.5/crates/tauri/src/manager/mod.rs).
Executable configuration tests assert each mapping, including Windows, and API
preflight tests verify exact allow/deny behavior. These tests are not device/WebView E2E.

CORS_ORIGINS must explicitly list the deployed origins that a product actually uses.
Packaged native origins are not added to the default API allowlist. Only the exact
capacitor://localhost and tauri://localhost strings extend HTTP(S) parsing;
arbitrary custom schemes, wildcards and opaque null origins remain rejected.
Changing a native scheme/hostname requires coordinated configuration, allowlist and tests.
A physical device's localhost is the device itself; use a reachable API host.
CORS is not an authentication mechanism.

Production secrets come from the deployment secret manager. `.env.example` is
only a local template. Never log database URLs, authorization headers, cookies,
request bodies, document contents or tokens.
