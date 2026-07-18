# Recommended GitHub repository settings

Apply these settings after creating the public repository; they cannot be enforced from source
control alone.

- Set the default branch to `main` (CI also supports `master` during migration).
- Require pull requests, one approving review, resolved conversations, and dismissal of stale
  approvals for protected paths.
- Require `verify`, `platform-shells`, `rename-smoke`, `dependency-review`, and the CodeQL
  `analyze` check.
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
