# ADR 0007 — Reusable multi-project foundation

- Status: accepted
- Date: 2026-07-12

## Context

The architecture is intended to be copied for unrelated products. Product
concepts must not leak into shared protocol, runtime,
security or persistence primitives.

## Decision

The repository has two ownership levels:

- `@product-foundation/*` packages are reusable and product-neutral;
- `@app/*` packages/apps are the replaceable application layer.

The initial foundation packages are:

- `rpc` — protocol contracts and envelopes;
- `rpc-client` — fetch/cancellation/typed client errors;
- `rpc-server` — validation and framework-neutral procedure execution;
- `backend-core` — application ports, tenant/security context and durable
  orchestration;
- `backend-postgres` — `pg` adapters, migration runner and platform migrations;
- `config` — tooling presets.

Foundation packages never import a product namespace. Products own their
procedures, business modules, authorization vocabulary, product migrations,
Nest composition, UI and deployment configuration.

Migration journal keys are `(namespace, name)`. Foundation uses namespace
`foundation`; each product chooses one stable namespace.

Packages remain private because the repository is copied as one starter. If a
future team needs independently upgraded shared packages across repositories,
publishing and semantic versioning require a separate ADR.

## Consequences

Foundation changes are verified independently and through `@app/*` as a real
consumer. A little more build wiring is required, but product code cannot
accidentally become a universal abstraction.
