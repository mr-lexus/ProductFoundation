# Как проходит запрос system-ping

[English version](./system-ping-flow.md)

`system-ping` — минимальный демонстрационный срез приложения. Это не функция
продукта: он проверяет границы обработки запроса и ответа в шаблоне.

```text
packages/contracts/src/system-ping.ts
  ↓ один контракт Zod/RPC
packages/frontend-app/src/shared/api/create-api-client.ts
  ↓ @product-foundation/rpc-client
POST /rpc/v1/system-ping
  ↓ контроллер NestJS
@product-foundation/rpc-server
  ↓ проверенный контекст обработчика
apps/api/src/modules/system/application/ping-system.ts
  ↓ обычная функция предметной области
версионированный ответ RPC
  ↓ проверка выхода во время выполнения
TanStack Query → экран состояния React
```

Контроллер только адаптирует HTTP. Исполнитель проверяет вход, выход, заголовки
и формат ответа. Код application/domain не импортирует NestJS или Fastify.

Этот срез можно удалить после появления первого продуктового RPC, если у него
есть равноценные проверки границ и его использует клиент фронтенда.
