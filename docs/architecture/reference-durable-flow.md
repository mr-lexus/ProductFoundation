# Reference durable flow

[Русская версия](./reference-durable-flow-RU.md)

The replaceable `@app/*` layer contains one deliberately technical reference capability. It proves
how a real product mutation connects the contracts, Nest transport, application code, PostgreSQL,
idempotency ledger, outbox and worker without adding business vocabulary to foundation packages.

```text
POST reference-durable-probe-create
  → validate contract and idempotency key
  → acquire transaction advisory lock
  → insert app.reference_durable_probes
  → append reference-durable-probe.created.v1
  → validate and persist response
  → commit once
  → worker claims with a per-message token
  → idempotent handler marks delivered_at
  → status query exposes the result
```

The Compose smoke runs this entire path and repeats the mutation with the same key to verify replay.
The HTTP integration test runs the same boundary against PostgreSQL. Products may delete or rename
the reference capability after their first real vertical slice provides equivalent coverage.

The reference capability is global and is registered only when a database exists and
`DATA_SCOPE_MODE=global`. Tenant products use their own tenant-owned table with forced RLS and the
negative tests described in `tenant-isolation.md`.

## Code path

| Step | Owner |
| --- | --- |
| Public input/output and procedure IDs | [`packages/contracts/src/reference-durable-probe.ts`](../../packages/contracts/src/reference-durable-probe.ts) |
| Domain creation rule | [`apps/api/src/modules/reference/domain/create-reference-durable-probe.ts`](../../apps/api/src/modules/reference/domain/create-reference-durable-probe.ts) |
| Mutation use case and outbox append | [`apps/api/src/modules/reference/application/create-reference-durable-probe.ts`](../../apps/api/src/modules/reference/application/create-reference-durable-probe.ts) |
| Durable RPC transport | [`apps/api/src/modules/reference/transport/reference-durable-probe-rpc.controller.ts`](../../apps/api/src/modules/reference/transport/reference-durable-probe-rpc.controller.ts) |
| Product table | [`apps/api/migrations/0001_reference_durable_probe.sql`](../../apps/api/migrations/0001_reference_durable_probe.sql) |
| PostgreSQL repository | [`apps/api/src/modules/reference/infrastructure/postgres-reference-durable-probe.repository.ts`](../../apps/api/src/modules/reference/infrastructure/postgres-reference-durable-probe.repository.ts) |
| Idempotent worker handler | [`apps/api/src/modules/reference/infrastructure/create-reference-durable-probe-outbox-handler.ts`](../../apps/api/src/modules/reference/infrastructure/create-reference-durable-probe-outbox-handler.ts) |
| Worker registration | [`apps/api/src/app/worker/create-outbox-handlers.ts`](../../apps/api/src/app/worker/create-outbox-handlers.ts) |
| HTTP/PostgreSQL proof | [`apps/api/src/app/http/reference-durable-probe.integration.test.ts`](../../apps/api/src/app/http/reference-durable-probe.integration.test.ts) |
| Full runtime proof | [`scripts/smoke-compose.mjs`](../../scripts/smoke-compose.mjs) |

## What the proof establishes

The integration test sends the mutation twice with one idempotency key and verifies that the second
response is the stored result. It then runs the real outbox worker, verifies one delivery, verifies
that a second worker pass has nothing to claim, and reads the delivered status over RPC.

The Compose smoke repeats the same behavior through the packaged database, migrations, API, and
worker services. Lower-level unit/integration suites separately exercise retry, lease expiry,
claim-token fencing, dead-letter state, retention, migration checksums, and idempotency conflicts.

This capability does not model a product domain or an external provider. Its only purpose is to
keep the state/idempotency/outbox invariant executable until a real product vertical slice replaces
it with equivalent coverage.
