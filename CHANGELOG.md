# Changelog

This project follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and intends to use
[Semantic Versioning](https://semver.org/) once the first public release is tagged.

## Unreleased

## [0.1.0-beta.1] - 2026-07-18

### Added

- Executable durable mutation reference flow with HTTP, PostgreSQL, worker, and Compose coverage.
- Repository hygiene, native security, AST import-boundary, and mandatory integration-test gates.
- Dead-letter inspection and confirmed single-message replay command.

### Changed

- Idempotency concurrency now uses a transaction advisory lock and stores only completed results.
- Outbox completion/failure is fenced by an expiring per-claim token.
- Public maturity is explicitly labeled beta until the complete acceptance matrix is green publicly.
- Foundation distribution is explicitly a versioned template snapshot without automatic upgrades.
- Unused audit, tracing, and replayable-projection placeholder exports were removed from
  `@product-foundation/backend-core` before the first public beta.

### Security

- Strict JSON media-type and idempotency-key validation.
- Exact-origin native configuration and pinned container base-image digests.
- Outbox payloads reject non-durable JSON values before issuing SQL.

### Verification

- `pnpm check`, production build, compiled API smoke, mobile build, native-security, and an isolated
  clean-checkout `dev:demo` bootstrap passed locally on 2026-07-18.
- GitHub PostgreSQL/Compose, product rename, Android debug assembly, Rust format/clippy, and Tauri
  build passed on release candidate `a7f90a9` in [CI run 29644574960].
- The private-repository dependency gate completed a high-severity lockfile audit with no known
  vulnerabilities. The CodeQL availability job passed separately in [run 29644574964]; native
  CodeQL upload and changed-dependency review activate automatically on a public repository.
- The annotated tag is published only after the final documentation-only closure commit passes the
  same required checks in [PR #6].

[CI run 29644574960]: https://github.com/mr-lexus/ProductFoundation/actions/runs/29644574960
[run 29644574964]: https://github.com/mr-lexus/ProductFoundation/actions/runs/29644574964
[PR #6]: https://github.com/mr-lexus/ProductFoundation/pull/6
