# Template lifecycle and upgrades

[Русская версия](./template-lifecycle-RU.md)

Product Foundation is released as a template snapshot. Copying it creates an independent product
repository; it does not establish a package update channel.

## Starting a product

1. Copy a tagged foundation release, not an arbitrary branch revision.
2. Keep the copied `FOUNDATION_VERSION` file.
3. Run the documented rename and complete acceptance checks.
4. Record product-specific identity, data-scope and deployment decisions in product ADRs.

## Reviewing upstream changes

1. Read every foundation release changelog since the recorded version.
2. Prioritize security, data-integrity and migration fixes.
3. Compare the two release tags and port changes through an ordinary reviewed pull request.
4. Re-run product authorization, tenant-isolation, migration and recovery tests.
5. Update `FOUNDATION_VERSION` only after the reconciliation is complete.

There is intentionally no automatic merge command. Product migrations, contracts and deployment
configuration make unattended template upgrades unsafe. A future registry-package model requires a
separate ADR and compatibility policy.

A possible future read-only `foundation doctor` could compare `FOUNDATION_VERSION` with published
release metadata and list relevant security, data-integrity, and reliability changes. It would not
merge code or update migrations automatically and requires a separate task with a stable release
metadata source.
