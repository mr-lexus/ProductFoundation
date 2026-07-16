## Problem and scope

<!-- What problem does this solve? Which application/package owns the change? -->

## Design and failure modes

<!-- Explain boundary choices, rollback/compatibility, and relevant failure scenarios. -->

## Verification

<!-- List exact commands and outcomes. State clearly what could not be run. -->

- [ ] `pnpm check`
- [ ] Relevant build/smoke command
- [ ] PostgreSQL integration tests when data or durable behavior changed
- [ ] `pnpm check:native` when mobile/desktop configuration changed
- [ ] Documentation/ADR updated when a public contract or lasting decision changed
- [ ] No secrets, generated output, local caches, or unrelated changes included

## Security and operations

<!-- Describe auth/isolation, migration, observability, rollout, and recovery impact; or write N/A. -->
