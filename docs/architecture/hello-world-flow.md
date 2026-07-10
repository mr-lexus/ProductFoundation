# Hello World Flow

## Purpose

This document shows how the monorepo layers connect in the smallest end-to-end example.

## Flow

```txt
packages/contracts
  ↓
apps/api
  ↓
packages/frontend-app
  ↓
apps/web | apps/mobile | apps/desktop
```

## Ownership

* `packages/contracts` owns shared request and response shapes
* `apps/api` owns backend use cases and RPC transport
* `packages/frontend-app` owns shared product-facing presentation flow
* `apps/web`, `apps/mobile`, and `apps/desktop` own shell-specific runtime wiring

## Backend Internal Flow

```txt
transport
  ↓
application
  ↓
domain
```

The hello world example follows that rule in `apps/api/src/modules/hello`.

## Runtime Demo Flow

The runnable demo now uses a real frontend-to-backend request:

```txt
apps/web
  Vite dev server / production build
    ↓
packages/frontend-app
  shared API client
    ↓
apps/api
  POST /rpc/hello-world
    ↓
apps/api/src/modules/hello
  transport → application → domain
```

## What Proves The Round Trip

The frontend renders backend-owned fields from the shared contract:

* `message`
* `requestId`
* `servedAt`
* `platform`

When the user clicks `Refetch from backend`, a new request hits the API and the response metadata changes.

## Shell Ownership

* `apps/web` renders the shared frontend in the browser
* `apps/desktop` wraps the same frontend through Tauri
* `apps/mobile` points Capacitor to the same web build output

The demo keeps the product UI in `packages/frontend-app` and keeps shell-specific runtime wiring in `apps/*`.
