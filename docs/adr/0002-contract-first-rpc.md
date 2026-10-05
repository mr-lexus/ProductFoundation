# ADR 0002: Framework-neutral contract-first RPC boundary

[Русская версия](./0002-contract-first-rpc-RU.md)

- Status: Accepted
- Date: 2026-07-11

## Context

The shared frontend cannot depend on `apps/api`: packages must not import concrete
app shells. Nest controllers, provider types and server router types therefore
cannot supply frontend contracts.

The public RPC boundary also needs runtime validation, a common error/version
envelope and independence from the HTTP framework.

## Decision

Use:

- Zod contracts in `packages/contracts`;
- a framework-neutral protocol in `@product-foundation/rpc`;
- a framework-neutral executor in `@product-foundation/rpc-server`;
- thin Nest controllers adapting HTTP request/reply;
- `/rpc/v1` and a common typed envelope;
- DTOs without NestJS/Fastify/HTTP metadata;
- one frontend client with runtime output validation.

Do not use Nest controller DTO classes, `RpcException`, provider types or
generated server module types as shared contracts. ADR 0004 separately records
the application framework and HTTP adapter decision.

## Consequences

Benefits:

- frontend and backend depend on one neutral boundary;
- runtime validation exists on both sides;
- NestJS/Fastify can be replaced without rewriting use cases and clients;
- errors, request IDs and versioning are consistent.

Costs:

- the small executor is maintained as a separate foundation package;
- route registration remains explicit through controllers;
- Nest pipes do not replace public contract validation;
- batching/subscriptions are not automatic.

Keep the executor and controllers small and covered by boundary tests.
Authorization policy, transactions and business orchestration belong to
application use cases, not Nest transport helpers.
