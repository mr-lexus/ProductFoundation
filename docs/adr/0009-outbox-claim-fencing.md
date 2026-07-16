# ADR 0009 — Outbox claims use expiring fencing tokens

- Status: accepted
- Date: 2026-07-16

## Context

Checking only `locked_by` is insufficient after a lease expires: the same worker identity can claim
the row again, and a delayed handler from the previous claim can then finalize the newer delivery.
An owner string identifies a process, not one lease generation.

## Decision

- Every claim writes a new random `claim_token` and an explicit `locked_until` timestamp.
- Completion and failure require message ID, worker ID, claim token, and an unexpired lease.
- Losing the lease is a hard error; a stale handler never updates the newer claim.
- Retries use bounded exponential equal jitter. Dead letters require an explicit, audited
  single-message requeue after the idempotent handler is fixed.
- Handlers must finish inside the configured lease. External effects remain idempotent because
  delivery is at least once and a process can fail after the effect but before completion.

## Consequences

Lease generations are fenced without a queue service or heartbeat protocol. Payloads are not
printed by the operator command. A future heartbeat feature must rotate or validate the same claim
token and must not let a stale execution extend a newer claim.

Migration `0004_outbox_claim_tokens.sql` clears pre-token beta locks. Upgrade from an earlier beta
therefore requires API/worker quiescence before migrations. This is a documented pre-stable
maintenance migration, not a rolling-compatible production migration.
