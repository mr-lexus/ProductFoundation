# Contributing

[Русская версия](./CONTRIBUTING-RU.md)

Thank you for improving Product Foundation.

## Before changing code

1. Read the root `AGENTS.md` and the nearest subtree `AGENTS.md`.
2. Keep `@product-foundation/*` product-neutral and `@app/*` replaceable.
3. Record lasting architectural changes in `docs/adr`.
4. Add focused tests for changed reliability or security behavior.

## Local workflow

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm build
```

Changes to PostgreSQL adapters require `TEST_DATABASE_URL` and the real integration tests.
Changes to Capacitor or Tauri configuration require `pnpm check:native`.

## Pull requests

Keep each pull request focused. Explain the problem, the chosen boundary, failure scenarios,
and verification evidence. Do not include secrets, generated native projects, build output,
or unrelated formatting changes.

Security reports follow [SECURITY.md](./SECURITY.md), not the public issue tracker.

Use the [pull-request template](./.github/pull_request_template.md). Mark every check truthfully, include commands and outcomes, and call
out any verification that could not run. A skipped database integration suite is not evidence that
database behavior passed.

## Bilingual documentation

Every Markdown page has an English file and a Russian companion with the `-RU.md` suffix.
Update both together. The first link after the heading switches to the same page in the other
language; all other local documentation links stay in the current language. Source-code links
and external documentation are shared.

`pnpm check:docs` checks page pairs, language switches, local targets and link language.
Reviewers still need to check translation accuracy and natural phrasing.
