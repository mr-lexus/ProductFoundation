# Foundation boundaries

[Русская версия](./foundation-boundaries-RU.md)

The repository has two levels of ownership.

## `@product-foundation/*`

The technical core contains no product domain:

| Package | Responsibility |
| --- | --- |
| `rpc` | Protocol, envelopes, errors, procedure definition |
| `rpc-client` | Fetch, cancellation, output validation |
| `rpc-server` | Input/output validation and handler execution |
| `backend-core` | Authorization/scope ports, idempotency and outbox orchestration |
| `backend-postgres` | `pg` adapters and foundation migrations |
| `config` | Shared tooling presets |

Foundation packages do not import `@app/*`, React, NestJS composition or product
contracts. `backend-postgres` is the only place that imports `pg` directly.

## `@app/*`

The replaceable product layer owns:

- public product contracts;
- backend capabilities and NestJS composition;
- the shared frontend and platform shells;
- product migrations and permission vocabulary;
- deployment configuration and observability labels.

Dependencies point only from `@app/*` to `@product-foundation/*`.

Packages remain private workspace packages. The starter is copied as a whole,
so a registry, publishing and independent package versioning are unnecessary.
