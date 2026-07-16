# Reference durable flow

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
