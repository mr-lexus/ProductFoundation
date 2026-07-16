# Contributing

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
