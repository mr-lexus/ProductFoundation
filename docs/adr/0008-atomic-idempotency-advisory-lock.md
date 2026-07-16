# ADR 0008 — Atomic idempotency with transaction advisory locks

- Status: accepted
- Date: 2026-07-16

## Context

The original ledger inserted a `processing` row and ran product work in the same PostgreSQL
transaction. A competing `INSERT ... ON CONFLICT` waits for that uncommitted row, so the advertised
lease takeover and fast `in_progress` result were not reachable during normal execution. Splitting
claim and product work into separate transactions would make the ledger visible, but would break
the stronger guarantee that product state, outbox and validated response commit atomically.

## Decision

- The entire mutation remains one PostgreSQL transaction.
- `pg_try_advisory_xact_lock(hashtextextended(identity, 0))` serializes one
  `(scope, procedure, idempotency key)` without waiting.
- Failure to acquire the transaction lock returns `in_progress` immediately.
- Only completed responses are stored; `processing`, `failed`, lease and owner columns are removed.
- A completed key replays its response, a different request hash conflicts, and expired results are
  removed inside later mutation transactions.

A rare advisory-hash collision can only produce a temporary false `in_progress`; it cannot execute
or expose another operation and is therefore fail-safe.

## Consequences

Concurrency semantics now match executable behavior and the ledger schema contains no unreachable
states. Mutations still need to be short database transactions; slow external work belongs in the
outbox. A future cross-database implementation must preserve the same atomic completion guarantee.

Migration `0003_atomic_idempotency.sql` removes unreachable beta-era states and columns. Upgrade
from an earlier beta requires stopping old mutation writers before migrations and deploying the new
runtime afterward. This pre-stable maintenance migration is intentionally not advertised as a
rolling production migration.
