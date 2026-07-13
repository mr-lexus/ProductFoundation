# AI Development Rules — Product Foundation Monorepo

## Purpose

This file defines repository-wide rules for a reusable, product-neutral starter.

Use this file together with the nearest more specific `AGENTS.md`.

Rule priority:

1. nearest local `AGENTS.md`
2. parent directory `AGENTS.md`
3. this root file

More specific rules refine generic ones. They do not cancel them unless they say so explicitly.

---

## Monorepo Layout

The repository is organized as:

```txt
apps/
  web/
  mobile/
  desktop/
  api/

packages/
  rpc/
  rpc-client/
  rpc-server/
  backend-core/
  backend-postgres/
  frontend-app/
  contracts/
  config/

docs/
  adr/
  architecture/
```

Responsibilities:

* `apps/web` — web runtime shell
* `apps/mobile` — Capacitor runtime shell for iOS and Android
* `apps/desktop` — Tauri runtime shell
* `apps/api` — backend application
* `packages/rpc` — framework-neutral RPC protocol and schemas
* `packages/rpc-client` — framework-neutral browser/native RPC client
* `packages/rpc-server` — framework-neutral RPC execution runtime
* `packages/backend-core` — reusable application ports and durable orchestration
* `packages/backend-postgres` — reusable PostgreSQL adapters and foundation migrations
* `packages/frontend-app` — shared frontend application code
* `packages/contracts` — application contracts and schemas
* `packages/config` — shared tooling presets

---

## Ownership Model

Foundation packages and application packages have different ownership.

Foundation packages use the `@product-foundation/*` namespace. They must remain
product-neutral and must not import `@app/*`, concrete apps, application
contracts, product UI, or product business vocabulary.

The `@app/*` namespace is the replaceable application layer of the starter.
After copying the repository, a product adds its contracts, modules,
configuration and UI there instead of adding domain code to foundation packages.

Platform shells must stay thin.

Business and product behavior should live in shared packages, not in runtime wrappers.

Prefer:

* `packages/frontend-app` for UI flows and product behavior
* `packages/contracts` for DTOs, schemas, and shared API types
* `apps/*` for platform bootstrap, runtime integration, and environment wiring

Do not copy the same feature into web, mobile, and desktop shells.

---

## Frontend Platform Strategy

This product is primarily written as a web application.

Supported frontend runtimes:

* browser web
* Capacitor for iOS and Android
* Tauri desktop shell

Default rule:

* build the product once in `packages/frontend-app`
* expose it through thin shells in `apps/web`, `apps/mobile`, and `apps/desktop`

Platform-specific code is allowed only when the platform truly differs.

Examples:

* Capacitor plugins
* push notification wiring
* native share integration
* file system integration
* Tauri window lifecycle

If platform-specific logic grows beyond trivial glue, isolate it behind explicit adapters.

---

## Backend Boundary

Backend architecture is intentionally separate from frontend architecture.

Do not mix:

* frontend state rules
* backend data access rules
* UI abstractions
* server orchestration

Reusable backend ports belong in `packages/backend-core`; PostgreSQL adapters
and foundation migrations belong in `packages/backend-postgres`. NestJS runtime
composition and product modules belong under the product API app.

Backend-specific composition decisions belong under `apps/api/AGENTS.md`.

---

## Contracts Rule

Product contracts belong in:

```txt
packages/contracts
```

Allowed content:

* request and response schemas
* DTO types
* shared enums
* validation schemas used at API boundaries

Forbidden content:

* frontend components
* backend repositories
* business services
* runtime-only framework code

Contracts are boundary artifacts, not a dumping ground for application logic.

Protocol-level envelopes, errors and procedure definitions belong in
`packages/rpc`; product procedures must not be added there.

---

## Dependency Rule

Applications may depend on packages.

Packages must not depend on concrete app shells unless a rule explicitly allows it.

Examples:

* `apps/web` may depend on `packages/frontend-app`
* `apps/mobile` may depend on `packages/frontend-app`
* `apps/desktop` may depend on `packages/frontend-app`
* `packages/frontend-app` must not depend on `apps/web`
* `packages/contracts` must remain shell-agnostic
* product packages may depend on `@product-foundation/*`
* foundation packages must never depend on product packages
* `backend-postgres` may depend on `backend-core`; the reverse is forbidden
* `rpc-client` and `rpc-server` may depend on `rpc`; the reverse is forbidden

Avoid circular dependencies across apps and packages.

---

## Documentation Rule

Architecture must remain discoverable from the file tree.

When introducing a new major area:

* place it under `apps` or `packages`
* give it one clear owner
* add or update the nearest `AGENTS.md` if rules differ

Major decisions belong in:

```txt
docs/adr
```

Repository-level structure explanations belong in:

```txt
docs/architecture
```

---

## Verification Rule

Every non-trivial change must be verified before completion.

Minimum verification:

* read all affected rule files when changing architecture
* verify the resulting directory layout
* run relevant diagnostics or tests when executable code changes
* state clearly when a verification step could not be run

Do not claim repository structure is correct without checking the resulting paths.

---

## AI Generation Rules

When working in this repository:

Always:

* read the nearest `AGENTS.md` before making changes in a subtree
* use `context7` when you need up-to-date library, framework, or tool documentation
* prefer extending the shared frontend package over cloning code into shells
* keep cross-boundary ownership obvious
* document exceptions when the default structure is bent

Never:

* hide product logic inside platform bootstrap code
* couple frontend packages to backend internals
* place shared contracts inside app-specific folders
* invent extra architecture layers without a concrete need

If unsure, choose the simpler structure with clearer ownership.
