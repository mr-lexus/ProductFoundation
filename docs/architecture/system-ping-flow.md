# System ping flow

`system-ping` — единственный демонстрационный vertical slice. Он не является
продуктовой функцией и нужен для проверки всех границ болванки.

```text
packages/contracts/src/system-ping.ts
  ↓ один Zod/RPC contract
packages/frontend-app/src/shared/api/system/ping-system.ts
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

Controller отвечает только за HTTP adaptation. Executor валидирует вход, выход,
headers и envelope. Application/domain код не импортирует NestJS или Fastify.

Slice можно удалить после появления первого продуктового RPC, если новый RPC
имеет такой же boundary test и используется frontend-клиентом.
