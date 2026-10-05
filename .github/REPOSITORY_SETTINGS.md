# Recommended GitHub repository settings

[Русская версия](./REPOSITORY_SETTINGS-RU.md)

Apply these settings after creating the public repository; they cannot be enforced from source
control alone.

## Presentation checklist

The 2026-10-05 repository audit observed a public repository with an empty description, no topics,
Template Repository disabled, and no GitHub Release for the existing
`foundation-v0.1.0-beta.1` tag. Apply these changes manually:

- Description: “Product-neutral TypeScript foundation for shared Web, Capacitor and Tauri apps
  with typed RPC, PostgreSQL idempotency/outbox, and executable architecture checks.”
- Topics: `typescript`, `react`, `nestjs`, `postgresql`, `capacitor`, `tauri`,
  `monorepo`, `typed-rpc`, `transactional-outbox`, `idempotency`,
  `ai-assisted-development`.
- Enable **Template repository** only after the default branch contains a green full acceptance
  matrix.
- Publish the existing annotated tag as a GitHub pre-release using the matching
  [changelog entry](../CHANGELOG.md); do not create a second version tag.
- Keep README badges absent unless one later communicates an actionable required check. Decorative
  stack/license badge rows do not improve the engineering presentation.

The current default branch is `master`. Renaming it to `main` is optional, not an architecture
change; if done, migrate branch protection and release links together. CI supports both names.

## Protection and security checklist

- Require pull requests, one approving review, resolved conversations, and dismissal of stale
  approvals for protected paths.
- Require `verify`, `platform-shells`, `rename-smoke`, `native-coverage`, `dependency-review`, and the CodeQL
  `analyze` check. On private repositories without GitHub Code Security, `dependency-review`
  performs a complete high-severity lockfile audit and `analyze` records that CodeQL is unavailable;
  the native GitHub checks activate automatically when the repository is public.
- Prevent force pushes and branch deletion; include administrators unless a documented emergency
  process requires otherwise.
- Enable private vulnerability reporting, Dependabot alerts/security updates, secret scanning with
  push protection, and dependency graph.
- Restrict GitHub Actions to allowed actions and pin every third-party action to a full commit SHA.
- Enable signed commits or vigilant mode and immutable release tags for published releases.
- Add a security contact link only after the final repository URL is known; `SECURITY.md` already
  directs reports to GitHub private vulnerability reporting.
- Add real maintainers through repository rules or CODEOWNERS once ownership is known; do not commit
  a fictional owner.
