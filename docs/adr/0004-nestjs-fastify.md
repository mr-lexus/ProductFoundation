# ADR 0004: NestJS application framework with Fastify

[Русская версия](./0004-nestjs-fastify-RU.md)

- Status: Accepted
- Date: 2026-07-11

## Context

People and AI agents must be able to maintain the backend over time. It needs
explicit business modules, dependency injection, lifecycle hooks, guards, filters,
observability and multiple runtime entrypoints. Manual Hono composition was
compact but provided no common application framework for those needs.

Shared contracts, application use cases and domain rules must remain independent
of the chosen framework.

## Decision

Use NestJS as the backend application framework and its official Fastify adapter
as the HTTP runtime.

NestJS owns:

- root and feature modules;
- dependency injection and provider lifecycle;
- controllers;
- global exception filters, guards and interceptors;
- application bootstrap and graceful shutdown.

Each business capability exports a thin Nest module from its `transport` layer.
Connect pure handlers/use cases through explicit provider tokens and factories.
Domain and application code receive no Nest decorators.

Fastify owns HTTP parsing and body limits. A global exception filter normalizes
framework/parser errors into the common RPC error envelope.

Do not use Nest microservices `RpcException`. The current protocol is HTTP JSON,
with the protocol boundary in `@product-foundation/rpc` and product procedures
in `packages/contracts`, rather than Nest transport types.

## Consequences

Benefits:

- one backend module model;
- a standard DI/lifecycle/testing ecosystem;
- explicit locations for authorization guards, observability and configuration;
- Fastify body limits apply before oversized payloads are materialized;
- the core stays testable without a Nest testing container.

Costs:

- decorators and DI need compiler configuration;
- bootstrap is heavier than a minimal Hono app;
- use cases can attract unnecessary `@Injectable()` wrappers;
- Fastify-specific plugins must be checked for Nest adapter compatibility.

The architecture gate rejects NestJS/Fastify imports outside `src/app` and
`src/modules/*/transport`, and rejects Hono imports entirely.
