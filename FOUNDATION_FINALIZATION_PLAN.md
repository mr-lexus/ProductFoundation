# Product Foundation: finalization plan

## Purpose

This is the last foundation-only iteration before product development starts. Its scope is fixed:
close the verified regressions in the current uncommitted diff, obtain one complete acceptance run,
record a reproducible snapshot, and stop foundation polishing.

Completion means **no known foundation blocker remains under the acceptance matrix below**. It does
not mean that arbitrary future reviews can find no possible improvement. After this plan is closed,
new work requires a product requirement, a reproduced defect, a security advisory, or a failed
quality gate.

## Audit baseline (2026-07-17)

The reviewed working tree contains 46 changed paths: 37 tracked changes and 9 untracked files.
The changes are directionally sound: they remove speculative abstractions, simplify the reference
ping flow, validate durable outbox JSON, improve rename coverage, strengthen native/CI checks, and
document snapshot distribution.

Current assessment:

| Area | Current | After this plan | Notes |
| --- | ---: | ---: | --- |
| Architecture and ownership | 8.5/10 | 8.5/10 | Boundaries pass; the foundation/application split is clear. |
| Backend reliability | 8.5/10 | 9/10 | Durable mutation, PostgreSQL, outbox, and isolation design are unusually strong for a starter. |
| Frontend/platform baseline | 8/10 | 8.5/10 | Shared frontend and thin shells are appropriate; product UI is intentionally absent. |
| Tooling and reproducibility | 6.5/10 | 8.5/10 | The audited diff had two red gates and one clean-checkout bootstrap regression. |
| Foundation release readiness | 7/10 | 8.5/10 | Full remote Linux/PostgreSQL/Docker/Rust/Android evidence is required. |

The target is not 10/10. A 10/10 foundation score would mostly measure speculative machinery and
would delay the product without reducing a demonstrated risk.

## Fixed completion scope

### F1. Restore deterministic local quality gates

- [x] Apply Biome's safe formatting/import-order fixes only to the files reported by
  `pnpm check:static`:
  - `scripts/check-markdown-links.mjs`;
  - `scripts/rename-product.test.mjs`;
  - `scripts/run-frontend-platform.mjs`;
  - `scripts/smoke-compose.mjs`.
- [x] Correct the sparse-array test fixture in
  `packages/backend-core/src/messaging/durable-json.test.ts`.
- [x] Run `pnpm check` from a clean process and require exit code 0.

Acceptance evidence: static checks and every unit/tooling suite pass without exclusions or retries.

Evidence (2026-07-18): `pnpm check` completed with exit code 0, including 51 unit tests and two
tooling tests.

### F2. Fix clean-checkout development bootstrap

- [x] Change `dev:demo` so it builds both API dependencies and frontend dependencies before starting
  the two long-running processes.
- [x] Verify from a fresh checkout/worktree with no generated `dist` directories:
  1. `pnpm install --frozen-lockfile`;
  2. `pnpm dev:demo`;
  3. API liveness responds successfully;
  4. the web entry page loads without a package-resolution error;
  5. stopping the parent command terminates both child processes.
- [x] Keep the fix inside existing package scripts. Do not introduce a task runner or build graph
  framework for this issue.

Acceptance evidence: the documented first-run development command works without stale local build
artifacts.

Evidence (2026-07-18): an isolated copy completed frozen install, built from no generated `dist`,
served API liveness and the web entry page, and shut down the complete terminal process tree.

### F3. Obtain the complete acceptance matrix once

- [x] Commit the reviewed finalization diff on a review branch.
- [ ] Run the GitHub checks on the exact release commit after it is pushed.
- [ ] Require all of the following to be green:
  - `verify`, including `pnpm check:ci`, production build, compiled API smoke, and Compose smoke;
  - `platform-shells`, including mobile build, Android debug assembly, Rust format/clippy, and Tauri
    build without bundling;
  - `rename-smoke` after applying a real product rename;
  - `dependency-review`, using GitHub's changed-dependency review when available and a complete
    high-severity lockfile audit on private repositories without GitHub Code Security;
  - CodeQL `analyze` when GitHub Code Security is available. On an unsupported private repository,
    the job must record the capability limitation and the lockfile audit remains mandatory.
- [ ] Treat flaky or environment-dependent failures as failures until their cause is identified. Do
  not rerun to green without recording why the first run failed.
- [ ] Make only fixes necessary to turn this fixed matrix green. Any newly proposed capability goes
  to the product backlog, not this plan.

Acceptance evidence: links to one green run of every required check for the same commit.

Local evidence (2026-07-18): `pnpm check`, `pnpm build`, `pnpm smoke:api`, `pnpm build:mobile`, and
`pnpm check:native-security` pass. Remote acceptance remains pending until the release commit is
pushed to the newly configured GitHub repository. Local Compose could not start because the Docker
daemon is unavailable; Rust checks require the CI toolchain.

First remote run evidence (2026-07-18): `verify` passed. The remaining failures were identified, not
blindly rerun: Android used Java 11 although the Gradle plugin requires at least Java 17 and the
installed Capacitor 8 Android library compiles for Java 21; the tooling test assumed the canonical
placeholders still existed after `rename-smoke`; and the private repository does not have GitHub Code
Security, so native dependency review and CodeQL upload are unavailable. The fixed workflow retains
those native checks for public repositories and uses a high-severity lockfile audit for the
private-repository dependency gate.

Sequencing note (2026-07-18): the version is committed before the remote run so the green CI evidence
and immutable tag can identify the same release SHA.

### F4. Freeze the foundation snapshot and start the product

- [x] Set `FOUNDATION_VERSION` to the immutable beta snapshot version `0.1.0-beta.1` before remote
  acceptance so the release commit itself contains the final version.
- [ ] Create the corresponding annotated Git tag `foundation-v0.1.0-beta.1` on the green release
  commit.
- [x] Record local acceptance, pending remote acceptance, and material compatibility/security notes
  in `CHANGELOG.md`.
- [ ] Copy/branch from that tag, run `pnpm product:rename`, and move immediately to product decisions:
  data scope, identity/session, permissions, first contract, first migration, and first vertical UI
  slice.

Acceptance evidence: the version file, tag, and accepted commit identify the same snapshot.

## Explicit non-goals

The finalization iteration must not add any of the following without a reproduced blocker in F1-F3:

- more generic ports, repositories, services, adapters, or architecture layers;
- authentication providers, product permissions, design-system choices, or business entities;
- microservices, Redis, queues beyond the existing outbox, search, realtime, or tracing backends;
- speculative compatibility layers for copied foundations;
- coverage-percentage work without a named risk or missing behavior assertion;
- dependency upgrades unrelated to a failing gate or active security advisory;
- documentation rewrites, naming cleanup, or refactors whose only argument is “could be cleaner.”

## Stop rule

Foundation work stops when F1-F4 are checked and the fixed acceptance commit is green. From that
point onward, an agent may open foundation work only when at least one trigger is present:

1. a reproducible defect;
2. a failed required check;
3. an active security advisory affecting the snapshot;
4. a concrete product requirement that the current boundary cannot support;
5. measured operational evidence that an existing design is insufficient.

“Review the repository and improve anything you can find” is not an admissible trigger. Reviews must
name the risk, affected behavior, reproduction/evidence, smallest correction, and acceptance test.
If they cannot, the suggestion is rejected or deferred.

## Decision after completion

Once the stop rule is satisfied, start business development even though low-value improvements will
always remain possible. Product work is the next source of evidence; it will reveal which foundation
changes are actually needed better than another context-free architecture review.
