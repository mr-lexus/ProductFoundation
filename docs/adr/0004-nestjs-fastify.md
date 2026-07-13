# ADR 0004: NestJS application framework with Fastify

- Status: Accepted
- Date: 2026-07-11

## Context

Backend должен долго развиваться людьми и AI-агентами, иметь явные business
modules, dependency injection, lifecycle hooks, guards, filters, observability
и несколько runtime entrypoints. Ручная композиция Hono была компактной, но не
давала единого application framework для этих задач.

При этом shared contracts, application use cases и domain rules не должны
зависеть от выбранного framework.

## Decision

Использовать NestJS как backend application framework и официальный Fastify
adapter как HTTP runtime.

NestJS владеет:

- root и feature modules;
- dependency injection и provider lifecycle;
- controllers;
- global exception filters, guards и interceptors;
- application bootstrap и graceful shutdown.

Каждый business capability экспортирует тонкий Nest module из своего
`transport` слоя. Pure handlers/use cases подключаются через явные provider
tokens и factories. Domain и application code не получают Nest decorators.

Fastify владеет HTTP parsing и body limits. Framework/parser errors
нормализуются global exception filter в общий RPC error envelope.

Не используется Nest microservices `RpcException`: текущий протокол — HTTP JSON
Protocol boundary из `@product-foundation/rpc`, product procedures из
`packages/contracts`, а не Nest transport types.

## Consequences

Плюсы:

- единая модульная модель backend;
- стандартный DI/lifecycle/testing ecosystem;
- явные места для auth guards, observability и configuration;
- Fastify body limit работает до materialization oversized payload;
- core остаётся тестируемым без Nest testing container.

Минусы:

- decorators и DI требуют compiler configuration;
- bootstrap тяжелее минимального Hono app;
- возможен соблазн превращать каждый use case в `@Injectable()` wrapper;
- Fastify-specific plugins должны проверяться на совместимость с Nest adapter.

Architecture gate запрещает NestJS/Fastify imports вне `src/app` и
`src/modules/*/transport`, а Hono imports запрещены полностью.
