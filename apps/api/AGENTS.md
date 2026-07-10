# AI Development Rules — GTD Planner Backend

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

Current direction:

* TypeScript
* RPC-first API style
* Hono RPC or tRPC as transport layer

Decision rule:

* Hono or tRPC may define the API edge
* business logic must not depend on the chosen RPC framework
* framework-specific code must stay at the transport boundary

The backend core must remain portable between Hono RPC and tRPC.

If a future switch between them would require rewriting use cases or domain rules, the architecture is wrong.

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
* `shared` — backend infrastructure and narrow cross-cutting utilities

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

Domain code must not know about Hono, tRPC, request objects, response objects, headers, or framework context.

---

## Module Shape

Each business module should prefer a structure like:

```txt
modules/
  hello/
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

* Hono route adapters
* tRPC procedures
* input parsing at the transport edge
* response mapping when required

Transport code must stay thin.

If transport contains business decisions, move that logic inward.

---

## Hono RPC and tRPC Rule

Hono RPC and tRPC are delivery mechanisms, not the application architecture.

Allowed framework knowledge:

* `src/app/rpc`
* `src/modules/*/transport`

Forbidden framework coupling:

* domain functions receiving Hono context or tRPC caller state
* use cases returning framework-specific response objects
* repositories depending on transport context

Preferred pattern:

```txt
RPC input
 ↓
transport validation and adapter
 ↓
application use case
 ↓
domain logic
 ↓
plain typed result
 ↓
transport response mapping
```

If Hono or tRPC is replaced, only transport and composition code should need substantial changes.

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
* logger wiring
* RPC app creation
* module registration
* server startup

`src/app` must not contain:

* business rules
* domain transformations
* feature-specific validation logic spread across the app

Keep bootstrapping separate from business behavior.

---

## Shared Layer Rule

`src/shared` exists for backend-wide infrastructure, not for dumping random helpers.

Allowed:

* infrastructure adapters
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

If persistence is introduced later, repositories must sit behind application boundaries.

Rules:

* repositories expose business-relevant operations, not table-shaped CRUD by default
* use cases call repositories
* domain code does not perform I/O
* transport code does not query storage directly

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

If Hono or tRPC provides validation helpers, use them only at the edge.
Do not spread framework-specific validation behavior through domain code.

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

* keep Hono or tRPC code at the edge
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

When the final backend stack is confirmed, update this file with:

* chosen RPC framework
* validation library
* persistence strategy
* auth model
* deployment shape
* background job strategy

Major backend decisions must also be recorded in `docs/adr`.
