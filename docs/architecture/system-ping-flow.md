# System ping flow

[Русская версия](./system-ping-flow-RU.md)

`system-ping` is the minimal demonstration slice. It is not a product feature;
it verifies the starter's request/response boundaries.

```text
packages/contracts/src/system-ping.ts
  ↓ one Zod/RPC contract
packages/frontend-app/src/shared/api/create-api-client.ts
  ↓ @product-foundation/rpc-client
POST /rpc/v1/system-ping
  ↓ NestJS controller
@product-foundation/rpc-server
  ↓ validated handler context
apps/api/src/modules/system/application/ping-system.ts
  ↓ plain domain function
versioned RPC envelope
  ↓ runtime output validation
TanStack Query → React status screen
```

The controller only adapts HTTP. The executor validates input, output, headers
and the envelope. Application/domain code imports neither NestJS nor Fastify.

The slice can be removed after the first product RPC has equivalent boundary
tests and is consumed by the frontend client.
