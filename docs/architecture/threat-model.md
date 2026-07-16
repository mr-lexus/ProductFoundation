# Foundation threat model

## Protected assets

- product and tenant-owned PostgreSQL rows;
- authentication/session material supplied by the product;
- idempotency responses and outbox payloads;
- migration-owner and runtime database credentials;
- operational logs, metrics and dead-letter metadata.

## Trust boundaries

Browser/native clients are untrusted. RPC input, headers and output are validated at the protocol
edge. The API runtime role is trusted to use foundation tables but, in tenant mode, is not trusted
to bypass product-table RLS. Migration credentials are more privileged and must never reach API or
worker processes. Worker handlers are privileged consumers of outbox payloads and must be reviewed
as external-effect code.

## Primary controls

- exact CORS origins, bounded bodies/rates and strict JSON media types;
- redacted logs and low-cardinality metrics;
- deny-by-default authorization ports supplied by the product;
- non-superuser, non-BYPASSRLS tenant runtime roles and forced RLS;
- atomic state/outbox/idempotency transactions;
- per-claim outbox tokens, bounded retry, dead letters and explicit replay;
- separate migration/runtime credentials and immutable checksummed migrations;
- pinned CI actions and container base-image digests.

## Residual product responsibilities

The foundation does not select identity, session storage, permission vocabulary, cloud isolation,
secret manager, database TLS trust roots, abuse policy or incident owner. Each product must record
those choices, test authorization and tenant policies, and perform backup/restore and incident
drills before traffic.

Foundation idempotency and outbox tables are system tables, not tenant-facing repositories. The API
and worker can process multiple scopes through narrow adapters; product modules in tenant mode do
not receive raw SQL capabilities. Outbox payloads must contain the minimum data required by the
handler because workers and operational retention can extend their lifetime.
