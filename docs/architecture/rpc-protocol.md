# Versioned contract-first RPC

## Решение

Публичная API-граница определяется в `packages/contracts`. NestJS отвечает за
application composition, а Fastify — за HTTP runtime; ни один из них не является
источником типов для frontend. Это сохраняет направление зависимостей:

```txt
packages/contracts
   ↑             ↑
apps/api    packages/frontend-app
```

Shared frontend никогда не импортирует `AppType` или другой тип реализации из
`apps/api`.

## Procedure contract

Каждая процедура имеет:

- стабильный ID вида `module.action`;
- `kind: query | mutation`;
- versioned path `/rpc/v1/...`;
- Zod input schema;
- Zod output schema, содержащую только публичный DTO.

Schemas описывают JSON wire values. `Date`, `BigInt`, class instances, circular
objects и transformations, меняющие значение при повторном parse, запрещены
runtime-проверкой. Нормализующий transform допустим только когда он стабилен
после JSON round trip.

HTTP method пока всегда `POST`. Это осознанно упрощает одинаковые клиенты web,
Capacitor и Tauri. HTTP caching для тяжёлых read models добавляется отдельным
решением, а не скрыто внутри RPC.

## Success envelope

```json
{
  "ok": true,
  "data": {
    "message": "Foundation is ready."
  },
  "meta": {
    "requestId": "01...",
    "servedAt": "2026-07-11T12:00:00.000Z"
  }
}
```

`data` валидируется output schema процедуры. `meta` принадлежит протоколу и
не смешивается с entity/application DTO.

## Error envelope

```json
{
  "ok": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "RPC input validation failed.",
    "retryable": false,
    "details": []
  },
  "meta": {
    "requestId": "01..."
  }
}
```

Публичные codes: `BAD_REQUEST`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`,
`CONFLICT`, `PAYLOAD_TOO_LARGE`, `UNSUPPORTED_MEDIA_TYPE`,
`RATE_LIMITED`, `INTERNAL_ERROR`.

Domain/application code не кодирует HTTP status. Ожидаемый отказ преобразуется
в `RpcApplicationError` на application/transport boundary. Неизвестная ошибка
логируется с request ID и превращается в безопасный `INTERNAL_ERROR`; stack,
SQL и внутренние сообщения клиенту не возвращаются.

## Request context

Handler получает:

- `requestId`;
- validated `idempotencyKey` либо `null`;
- время приёма;
- `AbortSignal`;
- actor (`kind`, `subjectId`) либо `null` до auth middleware.

Mutation handler дополнительно получает явный
`context.execution.transaction`; query handler получает обычный transport context
без database capability.

После введения auth transport создаёт actor, а use case выполняет авторизацию.
Repositories не читают HTTP headers, Nest execution context или Fastify request.

## Cancellation и retry

TanStack Query передаёт `signal` в RPC client, затем в `fetch` и handler.
Отмена не является server rollback: use case всё равно обязан использовать
transaction boundary для атомарности.

Автоматический retry допустим только для queries и idempotent mutations. Каждая
mutation требует `x-idempotency-key` и durable handler invoker. Handler получает
executor через `context.execution.transaction`. Product state, outbox messages,
schema-validated response и idempotency completion фиксируются одной PostgreSQL
transaction; ошибка откатывает их вместе. Повтор с тем же payload возвращает
сохранённый результат.

Внешние effects не выполняются внутри mutation transaction. Mutation записывает
outbox event, а идемпотентный worker handler выполняет effect.

Синхронная mutation должна держать транзакцию как можно короче. Параллельный дубликат
отсекается transaction-scoped advisory try-lock. Длительные операции ставятся в
transactional outbox и продолжаются worker-ом с отдельной политикой retry/lease.

## Версионирование

Внутри `v1` разрешены совместимые изменения:

- новое optional input field;
- новое output field, которое старый клиент игнорирует;
- новый error code только после обновления базового contract package.

Удаление/переименование поля, изменение смысла или required-статуса требует
`v2` либо staged migration. Старую версию удаляют после измеренного окончания
support window.

## Добавление процедуры

1. Создать schemas и contract в `packages/contracts`.
2. Создать/расширить owning backend module.
3. Реализовать domain rule и application use case.
4. Создать thin handler в `modules/*/transport`.
5. Зарегистрировать Nest module capability в `apps/api/src/app/app.module.ts`.
6. Добавить frontend wrapper в `shared/api` и query/mutation во владельце.
7. Добавить success, validation и ожидаемый error test.
8. Запустить `pnpm check`.

Batching, streaming, uploads и subscriptions не добавляются в общий adapter
заранее. Для них создаются отдельные transport capabilities и ADR.
