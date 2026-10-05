# Executable architecture

[Русская версия](./executable-architecture-RU.md)

Architecture documents explain intent. `pnpm check:architecture` verifies critical
ownership and dependency boundaries regardless of who wrote the change. The main
implementation is in [scripts/check-architecture.mjs](../../scripts/check-architecture.mjs),
platform rules in [scripts/frontend-boundaries.mjs](../../scripts/frontend-boundaries.mjs)
and regression tests in [scripts/check-architecture.test.mjs](../../scripts/check-architecture.test.mjs).

## Frontend boundaries

The check rejects:

- upward dependencies along `app → pages → widgets → features → entities → shared`;
- cross-slice imports of internals instead of the public `index.ts`;
- shared frontend dependencies on the API or runtime shells;
- Capacitor outside Mobile, Tauri outside Desktop, or PWA/service-worker code outside Web;
- `import.meta.env` in `packages/frontend-app`;
- direct `fetch` outside `shared/api`;
- relative imports between runtime shells and shell-to-shell manifest dependencies.

The import reader uses the TypeScript AST to detect static imports, re-exports,
dynamic imports, `require` and type imports. The FSD resolver handles relative
specifiers, conventional `@/...` aliases and deep self-imports through
`@app/frontend-app/...` consistently. The shared frontend deliberately has no
TypeScript path aliases; the gate rejects them so compiler resolution and boundary
checks cannot drift. If an alias becomes necessary, update the resolver and
regression tests together with the configuration.

## Backend and package boundaries

The check rejects:

- imports from `@product-foundation/*` into `@app/*`;
- packages importing concrete runtime apps;
- NestJS/Fastify outside API composition and module transport;
- `pg` outside `backend-postgres`;
- framework/driver dependencies in `backend-core`;
- upward backend dependencies from shared/modules to composition;
- upward module dependencies from domain/application to infrastructure/transport;
- imports of another module's internals;
- relative imports across package boundaries;
- workspace dependency cycles and package namespaces that do not match ownership.

Other checks cover repository hygiene, Markdown links, native security, independent
frontend artifacts, PWA behavior, migrations, PostgreSQL integration, product
renaming and the Compose runtime. See the complete
[verification map](./foundation-readiness.md).

## Limits of these guarantees

Executable checks do not prove product behavior, authorization rules, SQL semantics
or generated code correct. They verify formal constraints that can reliably be
derived from source, manifests and runtime tests. A new critical rule needs a
concrete failure scenario, followed by the smallest executable check and a
regression test. Do not expand the architecture linter for hypothetical completeness.
