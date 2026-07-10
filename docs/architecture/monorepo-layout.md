# Monorepo Layout

## Target Structure

```txt
apps/
  web/                      # browser runtime shell
  mobile/                   # Capacitor runtime shell for iOS and Android
  desktop/                  # Tauri runtime shell
  api/                      # backend application
    AGENTS.md

packages/
  frontend-app/             # shared React application code
    AGENTS.md
    src/
      app/
      pages/
      widgets/
      features/
      entities/
      shared/
  contracts/                # shared API schemas and DTOs
  config/                   # shared tooling presets

docs/
  adr/
  architecture/
```

## Architectural Intent

The product is authored once as a shared frontend application and exposed through thin runtime shells:

* `apps/web`
* `apps/mobile`
* `apps/desktop`

This avoids keeping three separate copies of the same UI and business behavior.

## Rule Resolution

Agents and developers should read rules in this order:

1. nearest local `AGENTS.md`
2. parent `AGENTS.md`
3. root `AGENTS.md`

Examples:

* work inside `packages/frontend-app/src/features/...` -> use `packages/frontend-app/AGENTS.md` plus root `AGENTS.md`
* work inside `apps/api/...` -> use `apps/api/AGENTS.md` plus root `AGENTS.md`

## Shell Responsibilities

### apps/web

Owns:

* browser entry point
* web-specific environment wiring
* static hosting integration

### apps/mobile

Owns:

* Capacitor config
* native plugin wiring
* mobile packaging

If two mobile variants are needed later, add them as explicit subfolders or dedicated apps only when the variants diverge materially.

### apps/desktop

Owns:

* Tauri config
* desktop lifecycle wiring
* native desktop integration

### apps/api

Owns:

* server bootstrap
* backend modules
* persistence integration
* server-side business execution

## Shared Package Responsibilities

### packages/frontend-app

Owns:

* product UI
* GTD workflows
* FSD slices
* frontend data fetching and mapping

### packages/contracts

Owns:

* shared request and response schemas
* DTOs
* shared enums
* boundary validation artifacts

### packages/config

Owns:

* shared lint config
* shared TypeScript config
* shared build presets
