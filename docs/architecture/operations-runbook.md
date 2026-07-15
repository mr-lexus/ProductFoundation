# Operations runbook

## Deployment order

1. Verify CI, backup freshness and restore test status.
2. Build one immutable image used by migrate, API and worker commands.
3. Run `node dist/app/database/migrate.js` once. Foundation migrations use the
   `foundation` journal namespace; every product-owned migration set must use a
   separate stable namespace.
4. Deploy API replicas and verify `/health/live`, `/health/ready`, RPC errors and
   `/metrics`.
5. Deploy worker replicas and verify `:9464/health/ready` and `:9464/metrics`.
   Inspect pending count, oldest age, failures and dead letters.
6. Run a production smoke request with no sensitive payload.

Migrations must be backward compatible with both old and new application
versions during the rollout window.

Migration filenames only need to be unique inside their namespace. Never reuse
a namespace for another product and never change an applied migration checksum.

## Application rollback

Roll back API/worker to the previous image. Do not edit an applied migration and
do not automatically run destructive down migrations. Expanded columns/tables
remain until a later contract migration after every old version is gone.

If a migration itself fails, the migration transaction rolls back and deploy
stops. If a non-transactional PostgreSQL operation is ever required, its ADR and
manual recovery steps must be reviewed before merge.

## Backup and restore

Production PostgreSQL must provide encrypted automated backups and point-in-time
recovery. At least quarterly:

1. restore the latest backup into an isolated account/network;
2. run migrations up to the deployed version;
3. run integrity queries and application smoke tests;
4. record actual RPO/RTO and any failed checks;
5. delete the isolated restore according to retention policy.

A backup is not considered valid until a restore drill succeeds. Local compose
data is disposable and is not a backup strategy.

## Incident triage

- API down, DB healthy: inspect structured startup/error logs and image/config.
- readiness down: inspect PostgreSQL connectivity and pool saturation; liveness
  alone must remain healthy.
- outbox lag rising: stop adding worker replicas blindly; inspect handler error
  rate, locks and downstream health.
- dead letters: preserve rows within the configured retention window, fix the
  idempotent handler, then replay through a reviewed product tool. Never edit
  payloads in place.
- suspected tenant leak: disable affected procedure, preserve audit/log evidence,
  rotate exposed credentials and start the security incident process.

## Initial service objectives

Before real traffic, use these as review targets rather than contractual SLOs:

- API availability: 99.9% monthly;
- p95 RPC latency: under 300 ms excluding intentionally long operations;
- server error rate: below 0.5%;
- outbox oldest pending age: below 60 seconds;
- zero unresolved tenant-isolation failures when `DATA_SCOPE_MODE=tenant`.

Alerts must link here or to a more specific runbook and identify an owner.

## Dependency build scripts

`pnpm-workspace.yaml` is deny-by-default for dependency build scripts. `esbuild`
is explicitly allowed because the checked-in toolchain requires its platform
binary. Optional `@parcel/watcher` scripts are explicitly denied. Workspace
packages are injected so modern `pnpm deploy` produces a portable API image.
Any new build permission requires dependency review.
