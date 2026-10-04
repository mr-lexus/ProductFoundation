# ADR 0010: Foundation releases are template snapshots

- Status: accepted
- Date: 2026-07-16

## Context

The repository is copied for unrelated products, while its internal packages remain private. A
copy is operationally independent and will inevitably acquire product-specific migrations,
contracts and deployment decisions. Pretending that every copy can be upgraded automatically would
hide merge risk and create an unsupported framework distribution model.

## Decision

- Product Foundation is distributed as versioned template snapshots.
- `FOUNDATION_VERSION` records the snapshot from which a product started or last reconciled.
- Public releases use immutable Git tags and include security, migration and compatibility notes.
- A copied product owns its code and does not receive automatic updates.
- Maintainers compare release tags, review the changelog and selectively port applicable fixes.
- Security advisories identify affected foundation releases and the commits that copied products
  need to assess.
- Independently versioned `@product-foundation/*` registry packages are out of scope. Introducing
  them requires a new ADR, package compatibility policy and upgrade tooling.

## Consequences

The ownership model is honest and simple: this is a starter baseline, not a remotely managed
framework. Products must budget for upstream review. Teams that need centralized upgrades should
either keep products in one monorepo or adopt a separately designed package distribution model.
