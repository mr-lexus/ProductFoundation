# Changelog

This project follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and intends to use
[Semantic Versioning](https://semver.org/) once the first public release is tagged.

## Unreleased

### Added

- Executable durable mutation reference flow with HTTP, PostgreSQL, worker, and Compose coverage.
- Repository hygiene, native security, AST import-boundary, and mandatory integration-test gates.
- Dead-letter inspection and confirmed single-message replay command.

### Changed

- Idempotency concurrency now uses a transaction advisory lock and stores only completed results.
- Outbox completion/failure is fenced by an expiring per-claim token.
- Public maturity is explicitly labeled beta until the complete acceptance matrix is green publicly.

### Security

- Strict JSON media-type and idempotency-key validation.
- Exact-origin native configuration and pinned container base-image digests.
