# Versioned contract-first RPC

[Русская версия](./rpc-protocol-RU.md)

## Decision

The public API boundary is defined in `packages/contracts`. NestJS owns application
composition and Fastify owns the HTTP runtime; neither supplies frontend types.
This preserves the dependency direction:

```txt
packages/contracts
   ↑             ↑
apps/api    packages/frontend-app
```

The shared frontend never imports `AppType` or another implementation type from `apps/api`.

## Procedure contract

Each procedure has:

- a stable `module.action` ID;
- `kind: query | mutation`;
- a versioned `/rpc/v1/...` path;
- a Zod input schema;
- a Zod output schema containing only the public DTO.

Schemas describe JSON wire values. Runtime checks reject `Date`, `BigInt`, class
instances, circular objects and transformations that change values on repeated
parsing. A normalizing transform is allowed only if it remains stable after a
JSON round trip.

The HTTP method is currently always `POST`. This deliberately keeps Web, Capacitor
and Tauri clients consistent. HTTP caching for expensive read models requires a
separate decision; it is not hidden inside RPC.

## Success envelope

```json
{
  "ok": true,
  "data": {
    "message": "Foundation is ready."
  },
  "meta": {
    "requestId": "01...",
    "servedAt": "2026-07-11T12:00:00.000Z"
  }
}
```

The procedure's output schema validates `data`. Protocol-owned `meta` stays
separate from entity/application DTOs.

## Error envelope

```json
{
  "ok": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "RPC input validation failed.",
    "retryable": false,
    "details": []
  },
  "meta": {
    "requestId": "01..."
  }
}
```

Public codes: `BAD_REQUEST`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`,
`CONFLICT`, `PAYLOAD_TOO_LARGE`, `UNSUPPORTED_MEDIA_TYPE`, `RATE_LIMITED`,
`INTERNAL_ERROR`.

Domain/application code does not encode HTTP status. Expected failures become
`RpcApplicationError` at the application/transport boundary. Unknown errors are
logged with the request ID and become safe `INTERNAL_ERROR` responses. Stack
traces, SQL and internal messages never reach the client.

## Request context

A handler receives:

- `requestId`;
- a validated `idempotencyKey` or `null`;
- the arrival time;
- an `AbortSignal`;
- an actor (`kind`, `subjectId`), or `null` before authentication middleware.

Mutation handlers also receive explicit `context.execution.transaction`.
Query handlers receive ordinary transport context without database capability.

Once authentication is added, transport constructs the actor and the use case
performs authorization. Repositories do not read HTTP headers, Nest execution
context or Fastify requests.

## Cancellation and retry

TanStack Query passes `signal` to the RPC client, then to `fetch` and the handler.
Cancellation does not roll back server work: the use case still needs a transaction
boundary for atomicity.

Automatic retry is allowed only for queries and idempotent mutations. Every
mutation requires `x-idempotency-key` and a durable handler invoker. The handler
receives its executor through `context.execution.transaction`. Product state,
outbox messages, schema-validated response and idempotency completion commit in
one PostgreSQL transaction; an error rolls them all back. Repeating the same
payload returns the stored result.

External effects do not run inside the mutation transaction. The mutation appends
an outbox event; an idempotent worker handler performs the effect.

Keep synchronous mutation transactions short. A transaction-scoped advisory
try-lock rejects concurrent duplicates. Long operations go through the
transactional outbox and continue in a worker with a separate retry/lease policy.

## Versioning

Compatible changes within `v1` include:

- a new optional input field;
- a new output field that old clients ignore;
- a new error code, only after updating the base contract package.

Removing or renaming a field, changing its meaning or making it required needs
`v2` or a staged migration. Remove an old version only after evidence shows its
support window has ended.

## Adding a procedure

1. Create schemas and a contract in `packages/contracts`.
2. Create or extend the owning backend module.
3. Implement the domain rule and application use case.
4. Create a thin handler in `modules/*/transport`.
5. Register the capability's Nest module in `apps/api/src/app/app.module.ts`.
6. Add a frontend wrapper in `shared/api` and a query/mutation in its owning slice.
7. Add success, validation and expected-error tests.
8. Run `pnpm check`.

Do not add batching, streaming, uploads or subscriptions to the common adapter
in advance. They need separate transport capabilities and ADRs.
