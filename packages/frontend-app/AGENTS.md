# AI Development Rules — Shared Frontend Application

## Purpose

This file defines architecture rules for the shared frontend application.

Scope:

```txt
packages/frontend-app
```

This package contains product UI and behavior shared by:

* web
* Capacitor iOS and Android shells
* Tauri desktop shell

Platform bootstrap belongs in app shells. Product logic belongs here.

---

## Tech Stack

* React
* TypeScript (strict)
* Vite-compatible frontend tooling
* TanStack Query
* Zustand
* React Router
* Zod
* SCSS

---

## Core Principles

Prioritize:

* clarity over abstraction
* consistency over flexibility
* explicitness over magic
* maintainability over cleverness
* composition over inheritance

The simplest correct solution is usually preferred.

---

## Source Layout

The frontend follows a lightweight Feature-Sliced Design structure.

```txt
src/
  app/
  pages/
  widgets/
  features/
  entities/
  shared/
```

Dependency direction:

```txt
app
 ↓
pages
 ↓
widgets
 ↓
features
 ↓
entities
 ↓
shared
```

Imports may only go downward.

A layer may import from any lower layer, not only the adjacent one.

Examples:

* `pages` may import from `widgets`, `features`, `entities`, and `shared`
* `features` may import from `entities` and `shared`
* `entities` may import from `shared`
* reverse imports are prohibited

Sibling slices inside the same layer must not depend on each other's internals.
Cross-slice imports must use public APIs only.

Circular dependencies are prohibited.

---

## Layer Responsibilities

### app

Contains:

* application bootstrap
* router
* providers
* layouts
* global frontend configuration

Must not contain business logic.

### pages

Contains:

* route composition
* page assembly

Must not contain:

* direct API calls
* domain logic

### widgets

Contains:

* reusable page blocks
* tables
* filter panels
* dashboards
* page sections

Widgets compose features and entities.

Widgets do not own business rules.

### features

Contains:

* user actions
* workflows
* interactions

Examples:

```txt
create-document
invite-member
update-profile
manage-subscription
```

Features may use entities and shared.

### entities

Contains business domains.

Examples:

```txt
user
workspace
document
subscription
```

Entities define business meaning.

Entities do not define screens.

### shared

Contains reusable infrastructure.

Examples:

```txt
ui
api
lib
config
types
constants
```

Shared must not contain business logic.

---

## Platform Rule

This package must stay platform-first, not shell-first.

Do not place runtime glue for Capacitor or Tauri inside arbitrary features.

Allowed here:

* platform capability abstractions
* feature-level usage of stable platform adapters
* UI fallbacks when a capability is unavailable

Prefer:

```txt
shared/lib/platform
shared/config/platform
```

App shells should inject platform-specific wiring. Features should consume explicit interfaces.

---

## Public API Rule

Every slice must expose a public API.

Example:

```txt
entities/task/
  api/
  model/
  ui/
  index.ts
```

Allowed:

```ts
import { TaskCard } from '@/entities/task'
```

Forbidden:

```ts
import { TaskCard } from '@/entities/task/ui/task-card'
```

Cross-slice imports must use public APIs only.

---

## Barrel Export Rule

Allowed:

```txt
entities/task/index.ts
features/auth/index.ts
```

Forbidden:

* nested barrel exports
* export chains
* wildcard export trees

Prevent circular dependency creation.

---

## UI Architecture

Third-party UI libraries must never be used directly in business code.

All UI components must be accessed through:

```txt
src/shared/ui
```

Business layers must not depend on a third-party UI kit directly.

---

## State Management

### TanStack Query

TanStack Query is the single source of truth for server state.

Rules:

* no server state in Zustand
* no duplicated cache
* no manual request caching
* no fetch logic in components

### Zustand

Zustand is only for client state.

Allowed:

* auth session
* UI state
* user preferences
* multi-step forms
* temporary drafts

Forbidden:

* backend collections
* API responses
* query cache duplication

React local state should be preferred before introducing a store.
Only promote state to Zustand when it is shared, long-lived, or workflow-specific.

---

## API Architecture

All API communication must be centralized.

Shared API infrastructure:

```txt
src/shared/api/
  client/
  queryKeys/
  types/
```

Entities may define only thin TanStack Query wrappers over shared API infrastructure.

All HTTP requests and transport logic must stay in `shared/api`.
Entities must not contain direct fetch logic or business orchestration.

Use typed requests and typed responses.

UI must not depend on unstable backend contracts.

Preferred flow:

```txt
DTO
 ↓
Mapper
 ↓
Domain Model
 ↓
UI
```

Mapping is required only when:

* DTO differs from UI model
* normalization exists
* business transformation exists

Simple DTOs may be used directly.

Avoid pointless mappers.

Product semantics and workflow rules must not be hardcoded in components.

If a contract is shared with the backend, import it from `packages/contracts` rather than duplicating it locally.

---

## Forms

All forms must use Zod for validation.

Mixing validation systems is prohibited.

Each feature must use one consistent form architecture.

Form state belongs to features unless reused across multiple features.

---

## Permissions

Role and permission checks must be centralized.

Forbidden:

```ts
if (user.role === 'admin')
```

inside arbitrary components.

Use centralized permission helpers inside:

```txt
src/features/auth/permissions
```

Permissions must be reusable and testable.

They must not depend on UI state.

---

## Styling Architecture

Styles must use SCSS with BEM naming.

Rules:

* each UI block owns a single explicit BEM block name
* elements use `block__element`
* modifiers use `block--modifier` and `block__element--modifier`
* class names must describe structure and state, not visual guesses
* avoid unstructured `className` concatenation that hides component states
* avoid deep selector nesting when a clearer BEM class can be added
* inline styles are allowed only for truly dynamic values that cannot be expressed via modifiers or CSS variables

BEM must improve readability, not turn into ceremony.

---

## List and Table Architecture

Collections with the same interaction model should share common behavior.

Supported features:

* pagination
* sorting
* filtering
* bulk actions
* row selection
* column visibility
* grouping when it reflects product concepts such as owner, category, or status

All collection logic must be reusable via hooks or feature modules.
No table-specific or list-specific logic inside pages.

---

## Performance Rules

Always prefer:

* server-side pagination
* derived state close to usage
* memoization only when it solves a real render problem
* lazy loading

Avoid:

* unnecessary `useEffect`
* broad context or store subscriptions that cause avoidable rerenders
* loading entire datasets
* unnecessary state mirroring

Soft limit:

```txt
200 rows per render
```

Above that, consider pagination or virtualization.

---

## Component Rules

Prefer:

* small components
* focused responsibilities
* composition

Extract reusable UI or interaction logic into hooks.

Guideline:

```txt
~200 lines
```

is a signal to evaluate splitting a component.

Use judgment.

---

## Hook Rules

Hook categories:

```txt
useUi*
use*Query
use*Mutation
use*Store
```

Hooks must remain UI or interaction helpers only.

Use hooks for:

* UI state wiring
* query and mutation composition
* reusable interaction handlers
* view-specific derived state

Do not use hooks for:

* domain rules
* business transformations
* workflow orchestration
* hidden service layers

Domain logic belongs to entities and features, not hooks.

If logic answers a business question, place it in `entities` or `features` and let hooks consume it.

Collection and table behavior may live in hooks only when it is UI behavior.
Product semantics and workflow rules belong to `features` or `entities`.

---

## Ownership Rule

Every file must have a clear owner.

Place logic at the highest level where responsibility is still clear:

* shared -> infrastructure only
* entities -> domain logic
* features -> application logic
* widgets -> UI orchestration
* pages -> routing composition

Do not create utility dumping grounds.

Do not move logic downward without a clear reason.

---

## Verification Rule

Every non-trivial change must be verified before completion.

Minimum verification:

* read affected files in full when changing architecture, shared infrastructure, or public APIs
* run relevant diagnostics, lint, or typecheck for the changed area when available
* run affected tests when changing business logic, mappers, permissions, validation, or query behavior
* if a verification step cannot be run, state that explicitly

Do not claim a fix without verification evidence.

---

## ADR Rule

Major architectural decisions must be documented.

Location:

```txt
docs/adr
```

Large exceptions and lasting architecture changes belong in ADRs.

Local exceptions may be documented either:

* next to the code with a short comment
* in `docs/architecture-exceptions.md`

Each documented exception must state:

* which rule is being bent
* why the default rule is worse here
* the scope of the exception

Prefer the lightest documentation format that keeps the exception discoverable.
