# AI Development Rules — Application Backend

## Purpose

This file defines backend architecture rules for:

```txt
apps/api
```

Use this file together with the root `AGENTS.md`.

The backend must stay explicit, testable, and transport-agnostic in its core.

The goal is strong architecture, not accidental complexity.

---

## Technology Direction

Confirmed foundation:

* TypeScript
* NestJS as the backend application framework
* Fastify as the Nest HTTP adapter
* contract-first, versioned RPC over JSON
* Zod schemas in `packages/contracts`
* modular monolith deployment

NestJS owns modules, dependency injection, application lifecycle, controllers,
global filters, and runtime composition. Fastify-specific code is allowed only
at the HTTP transport edge.

The frontend consumes shared procedure contracts and never imports Nest modules,
controllers, providers, or implementation types from `apps/api`.

NestJS decorators and DI tokens are allowed in `src/app` and
`src/modules/*/transport`. Domain and application code remain plain TypeScript.
Use explicit provider tokens/factories when connecting pure handlers and use
cases to Nest DI.

Business logic must remain portable. Replacing Fastify or NestJS may require
changes to composition and transport, but must not require rewriting use cases
or domain rules.

Every public procedure uses the common RPC envelope, typed error codes, request
IDs, explicit API version, input/output validation, and cancellation signal.

---

## Core Principles

Prioritize:

* explicit boundaries
* business-first module ownership
* transport independence
* validation at the edge
* testability over convenience
* boring code over clever code

The backend must remain understandable after years of change.

---

## Source Layout

Use this high-level structure:

```txt
src/
  app/
  modules/
  shared/
```

Responsibilities:

* `app` — bootstrap, server composition, RPC registration, env wiring
* `modules` — business capabilities
* `shared` — application-local cross-cutting code only when no foundation owner exists

Reusable protocol/runtime code belongs in `@product-foundation/rpc*` packages.
Reusable backend ports and PostgreSQL adapters belong in
`@product-foundation/backend-core` and `backend-postgres`. Do not recreate them
inside the app.

Do not scatter a single use case across unrelated top-level folders.

---

## Dependency Direction

Repository-level direction:

```txt
app
 ↓
modules
 ↓
shared
```

Rules:

* `app` may depend on `modules` and `shared`
* `modules` may depend on `shared`
* `shared` must not depend on modules
* reverse imports are prohibited

Within a module, use this internal direction:

```txt
transport
 ↓
application
 ↓
domain
```

Meaning:

* transport knows RPC and HTTP details
* application coordinates use cases
* domain owns business meaning

Domain code must not know about NestJS, Fastify, decorators, DI tokens, request objects, response objects, headers, or framework context.

---

## Module Shape

Each business module should prefer a structure like:

```txt
modules/
  capability/
    contract/
    domain/
    application/
    transport/
```

Responsibilities:

### contract

Defines the module API surface consumed at boundaries.

This may re-export shared contracts from `packages/contracts` or define module-local boundary types when they are not shared outside the backend.

### domain

Contains:

* domain concepts
* domain rules
* invariants
* pure calculations

Domain code must be framework-free.

### application

Contains:

* use cases
* orchestration
* transactional flow
* permission checks at the use-case boundary

Application code may coordinate repositories, services, and domain functions, but it must not become a bag of unstructured helpers.

### transport

Contains:

* NestJS controllers
* one thin Nest module composition boundary per business capability
* explicit DI tokens/providers that connect pure handlers and use cases
* Fastify request/reply adaptation when platform behavior is required
* response mapping when required

Transport code must stay thin. Do not add an `@Injectable()` service that merely
renames an application use case.

If transport contains business decisions, move that logic inward.

---

## NestJS and Fastify Rule

NestJS is the backend application framework, not the domain architecture.

Allowed framework knowledge:

* `src/app`
* `src/modules/*/transport`

Forbidden framework coupling:

* domain/application functions receiving Nest execution context
* use cases returning Nest/Fastify response objects
* repositories depending on request-scoped transport state
* decorators or DI tokens in domain code
* importing one module's controller/provider internals from another module

Preferred pattern:

```txt
Nest controller
 ↓
framework-neutral RPC executor
 ↓
application use case
 ↓
domain logic
 ↓
plain typed result
 ↓
common RPC envelope
```

Global exception filters normalize parser/framework failures. Expected business
failures use application errors and are mapped by the RPC executor. Nest modules
compose dependencies; they do not own business behavior.

If Fastify or NestJS is replaced, only transport and composition code should
need substantial changes.

---

## Contracts Rule

Shared frontend-backend contracts belong in:

```txt
packages/contracts
```

Place there:

* public RPC input types
* public RPC output types
* shared enums
* shared validation schemas for API boundaries

Do not place there:

* repositories
* database models
* backend-only service internals
* secrets
* framework objects

Contracts are for shared boundaries, not server internals.

If the frontend needs the type, schema, or shape, it belongs in `packages/contracts`.

---

## App Layer Rule

`src/app` owns runtime composition only.

Examples:

* env parsing
* Nest application bootstrap
* root module composition
* global filters, guards, and interceptors
* module registration
* server startup

`src/app` must not contain:

* business rules
* domain transformations
* feature-specific validation logic spread across the app

Keep bootstrapping separate from business behavior.

---

## Shared Layer Rule

`src/shared` exists for product-local backend code, not for dumping reusable
foundation helpers.

Allowed:

* common error primitives
* time and id helpers
* narrow utility functions
* shared backend-only types

Forbidden:

* business workflows
* feature-specific policies
* large generic service layers
* utility buckets with unclear ownership

If a helper clearly belongs to one module, keep it in that module.

---

## Repository Rule

Persistence sits behind application ports and module-owned repositories.

Rules:

* repositories expose business-relevant operations, not table-shaped CRUD by default
* use cases call repositories
* domain code does not perform I/O
* transport code does not query storage directly
* `pg` imports remain inside `@product-foundation/backend-postgres`
* raw `SqlExecutor` is for infrastructure/system operations; tenant-owned
  repositories run through `TenantTransactionRunner`
* every tenant-owned repository method accepts an explicit `WorkspaceScope`
* state changes and their outbox messages share one transaction
* applied SQL migrations are immutable and forward-only

Do not create repository layers before there is real persistence complexity.

Avoid:

* repository-per-table cargo cult
* generic base repositories
* ORM leakage into transport code

---

## Validation Rule

Validate all untrusted input at the boundary.

Boundary examples:

* RPC procedure input
* headers
* env values
* webhook payloads
* external service responses

Validation must happen before business logic relies on the data.

Prefer explicit schemas over ad hoc checks.

Nest pipes may validate transport-only values, but public RPC input/output must
still use schemas from `packages/contracts`. Do not spread framework-specific
validation behavior through domain code.

---

## Error Handling Rule

Error handling must stay layered.

Prefer:

* domain errors for business rule violations
* application-level mapping for use-case outcomes
* transport-level mapping for protocol responses

Do not:

* throw raw database or framework errors directly to clients
* encode HTTP or RPC status semantics inside domain code
* parse infrastructure error strings in random places

Backend error behavior must be predictable and centrally understandable.

---

## Authorization Rule

Authorization belongs at use-case boundaries, not inside arbitrary helper functions.

Allowed:

* explicit permission checks inside application use cases
* dedicated authorization helpers consumed by use cases

Forbidden:

* authorization hidden inside transport adapters
* authorization scattered through repositories
* UI-style role checks copied into unrelated backend code

Security decisions must be traceable.

---

## Testing Rule

Tests should follow the architecture.

Prioritize:

* domain tests for pure rules
* application tests for use-case orchestration
* transport tests for boundary mapping when transport logic is non-trivial

Do not rely only on end-to-end tests when important domain behavior can be verified with focused tests.

---

## No Hidden Architecture Rule

Avoid hidden architecture layers such as:

* implicit service layers with unclear ownership
* magic context objects carrying half the application state
* transport helpers that secretly implement business rules
* shared utilities that become a second application layer

Business behavior must remain traceable from RPC entry to use case to domain rule.

---

## Verification Rule

Every non-trivial backend change must be verified before completion.

Minimum verification:

* read affected modules in full when changing architecture or shared infrastructure
* run relevant tests for touched modules
* run lint or typecheck when available
* verify boundary contracts when changing shared RPC shapes
* state explicitly when a verification step could not be run

Do not claim transport safety or shared contract compatibility without verification evidence.

---

## AI Generation Rules

When generating backend code:

Always:

* keep NestJS and Fastify code inside app composition or module transport
* place business rules in domain or application layers
* prefer explicit module ownership
* reuse `packages/contracts` for shared API boundaries
* keep transport adapters thin

Never:

* couple use cases to framework context
* create generic service abstractions for a single module
* move business decisions into `shared` just for reuse
* expose database-shaped models directly as public RPC contracts
* bypass module boundaries with random cross-imports

If unsure, keep the code closer to the owning module and choose the simpler explicit design.

---

## Decision Log Rule

Confirmed decisions:

* application framework — NestJS with the official Fastify adapter
* RPC edge — repository-owned contract-first executor and thin Nest controllers
* validation — Zod at every untrusted boundary
* deployment — modular monolith first
* persistence — PostgreSQL through `@product-foundation/backend-postgres`
* migrations — immutable versioned SQL with checksums and an advisory lock
* tenancy — explicit workspace scope and transaction-local PostgreSQL context
* async consistency — transactional outbox and a separate worker entrypoint
* repeated mutations — workspace-scoped idempotency ledger

Open decisions that require a dedicated ADR before implementation:

* session/token implementation and external identity provider
* external queue provider, only if PostgreSQL outbox polling is insufficient
* product-specific storage, search, realtime and external integrations

Major backend decisions must also be recorded in `docs/adr`.
