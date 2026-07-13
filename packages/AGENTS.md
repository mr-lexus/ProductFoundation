# AI Development Rules — Packages

Packages expose deliberate public APIs and never depend on concrete app shells.

Namespaces:

- `@product-foundation/*` — reusable, product-neutral foundation;
- `@app/*` — replaceable application code in this starter.

Foundation packages must not import application packages or use product-domain
vocabulary. Application packages may depend on foundation packages. Cross-package
imports use package exports, never another package's `src` path.

Compiled foundation packages use native Node ESM, `.js` relative specifiers in
TypeScript source, declarations, source maps and explicit `files` allowlists.
After changing a public package, verify it independently and through at least
one real consumer.
