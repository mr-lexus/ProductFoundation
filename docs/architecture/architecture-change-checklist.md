# Architecture change checklist

Use this checklist in human and AI-agent reviews.

## Ownership

- Is there one obvious owner under `apps` or `packages`?
- Does dependency direction still point inward?
- Is a new abstraction justified by a real second implementation or boundary?
- Did the nearest `AGENTS.md` and architecture gate remain accurate?

## Boundary and data

- Is public input/output represented by a versioned contract and Zod schema?
- Are domain/application files free from NestJS, Fastify and `pg`?
- Does the product use the correct `DATA_SCOPE_MODE`?
- Does every tenant-owned repository require `TenantScope`?
- Does every tenant-owned table enable and force RLS, define a policy, pass
  `assertTenantRelationsSecure`, and have negative cross-tenant tests?
- Does the transaction contain the state change and its outbox event?
- Does every RPC mutation use the durable idempotency invoker?
- Is the migration forward-only, immutable and expand/contract compatible?

## Security and reliability

- Is authorization deny-by-default at the use-case boundary?
- Can logs/metrics/traces expose tokens, payloads, business content or secrets?
- Are timeout, cancellation, retry and failure ownership explicit?
- Is graceful shutdown safe for HTTP, pool and worker leases?
- Does a new dependency pass the supply-chain policy and have a clear owner?

## Evidence

- Are unit, integration and boundary tests proportional to risk?
- Does `pnpm check` pass with a real PostgreSQL service when data changed?
- Do `pnpm build`, `pnpm smoke:api` and container build pass?
- Are ADR, runbook, environment contract and rollback steps updated?
