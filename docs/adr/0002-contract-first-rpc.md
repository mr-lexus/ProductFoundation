# ADR 0002: Framework-neutral contract-first RPC boundary

- Status: Accepted
- Date: 2026-07-11

## Context

Shared frontend package не может зависеть от `apps/api`: packages не должны
импортировать concrete app shells. Поэтому Nest controllers, provider types и
server router types не могут быть источником frontend contracts.

Public RPC boundary также должна иметь runtime validation, единый error/version
envelope и сохраняться при замене HTTP framework.

## Decision

Использовать:

- Zod contracts в `packages/contracts`;
- framework-neutral protocol в `@product-foundation/rpc`;
- framework-neutral RPC executor в `@product-foundation/rpc-server`;
- thin Nest controllers, которые адаптируют HTTP request/reply;
- `/rpc/v1` и общий typed envelope;
- DTO без NestJS/Fastify/HTTP metadata;
- единый frontend client с runtime output validation.

Не использовать Nest controller DTO classes, `RpcException`, provider types
или generated server module types как shared contracts. Выбор application
framework и HTTP adapter зафиксирован отдельно в ADR 0004.

## Consequences

Плюсы:

- frontend/backend зависят от одной нейтральной границы;
- runtime validation существует с обеих сторон;
- NestJS/Fastify можно заменить без переписывания use cases и clients;
- errors, request IDs и versioning единообразны.

Минусы:

- небольшой executor поддерживается как отдельный foundation package;
- route registration остаётся явной через controllers;
- Nest pipes не заменяют public contract validation;
- batching/subscriptions не появляются автоматически.

Executor и controllers обязаны оставаться маленькими и покрытыми boundary tests.
Auth policy, transactions и business orchestration принадлежат application
use cases, а не Nest transport helpers.
