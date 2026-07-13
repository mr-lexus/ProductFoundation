# Monorepo layout

```text
apps/
  api/                    NestJS composition, product backend modules, worker
  web/                    browser bootstrap
  mobile/                 Capacitor bootstrap and native adapters
  desktop/                Tauri bootstrap and desktop adapters

packages/
  contracts/              product RPC schemas and DTOs
  frontend-app/           shared React product application
  rpc/                    framework-neutral protocol
  rpc-client/             framework-neutral client
  rpc-server/             framework-neutral executor
  backend-core/           backend ports and durable orchestration
  backend-postgres/       PostgreSQL adapters and foundation migrations
  config/                 shared tooling configuration

docs/
  adr/                    lasting decisions and their trade-offs
  architecture/           current architecture and operations
```

## Ownership

`apps/*` are deploy/runtime boundaries. They may import packages. Packages must
not import concrete app shells.

`@product-foundation/*` is product-neutral. `@app/*` is the product layer that
the team extends after copying the starter.

`packages/contracts` owns only boundary schemas/types. `packages/frontend-app`
owns cross-platform product UI. `apps/api/src/modules` owns backend capabilities.

## Thin shell rule

Do not implement the same feature separately in web, mobile and desktop. Put it
in `frontend-app`; inject platform differences through explicit adapters.

Shell-local code is appropriate for push notifications, filesystem, native
share, window lifecycle and platform bootstrap.

## Public API rule

Cross-package imports use package exports. Cross-slice frontend imports use the
slice `index.ts`. Do not import another package's or slice's internal `src` path.
