# Пример надёжной изменяющей операции

[English version](./reference-durable-flow.md)

В заменяемом слое `@app/*` есть один намеренно технический пример. Он показывает,
как мутация продукта связывает контракты, транспорт Nest, прикладной код,
PostgreSQL, журнал идемпотентности, outbox и фоновый процесс. При этом в пакеты
основы не добавляются понятия предметной области.

```text
POST reference-durable-probe-create
  → проверить контракт и ключ идемпотентности
  → получить рекомендательную блокировку на время транзакции
  → записать строку в app.reference_durable_probes
  → добавить reference-durable-probe.created.v1
  → проверить и сохранить ответ
  → один раз зафиксировать транзакцию
  → фоновый процесс захватывает сообщение с отдельным токеном
  → идемпотентный обработчик проставляет delivered_at
  → запрос состояния возвращает результат
```

Smoke-тест Compose проходит весь путь и повторяет мутацию с тем же ключом,
проверяя возврат сохранённого ответа. Интеграционный HTTP-тест проверяет ту же
границу с PostgreSQL. Продукт может удалить или переименовать пример после
появления первого реального сквозного сценария с равноценным покрытием.

Пример использует общую область данных и регистрируется только при наличии
базы и `DATA_SCOPE_MODE=global`. Продукты с арендаторами создают собственную
таблицу с принудительным RLS и негативными тестами из
[требований к изоляции](./tenant-isolation-RU.md).

## Путь по коду

| Шаг | Файл |
| --- | --- |
| Публичные вход, выход и идентификаторы процедур | [packages/contracts/src/reference-durable-probe.ts](../../packages/contracts/src/reference-durable-probe.ts) |
| Правило создания в предметной области | [apps/api/src/modules/reference/domain/create-reference-durable-probe.ts](../../apps/api/src/modules/reference/domain/create-reference-durable-probe.ts) |
| Сценарий мутации и запись в outbox | [apps/api/src/modules/reference/application/create-reference-durable-probe.ts](../../apps/api/src/modules/reference/application/create-reference-durable-probe.ts) |
| Транспорт надёжного RPC | [apps/api/src/modules/reference/transport/reference-durable-probe-rpc.controller.ts](../../apps/api/src/modules/reference/transport/reference-durable-probe-rpc.controller.ts) |
| Таблица продукта | [apps/api/migrations/0001_reference_durable_probe.sql](../../apps/api/migrations/0001_reference_durable_probe.sql) |
| Репозиторий PostgreSQL | [apps/api/src/modules/reference/infrastructure/postgres-reference-durable-probe.repository.ts](../../apps/api/src/modules/reference/infrastructure/postgres-reference-durable-probe.repository.ts) |
| Идемпотентный фоновый обработчик | [apps/api/src/modules/reference/infrastructure/create-reference-durable-probe-outbox-handler.ts](../../apps/api/src/modules/reference/infrastructure/create-reference-durable-probe-outbox-handler.ts) |
| Регистрация обработчика | [apps/api/src/app/worker/create-outbox-handlers.ts](../../apps/api/src/app/worker/create-outbox-handlers.ts) |
| Проверка HTTP и PostgreSQL | [apps/api/src/app/http/reference-durable-probe.integration.test.ts](../../apps/api/src/app/http/reference-durable-probe.integration.test.ts) |
| Проверка полного запуска | [scripts/smoke-compose.mjs](../../scripts/smoke-compose.mjs) |

## Что подтверждает пример

Интеграционный тест дважды отправляет мутацию с одним ключом идемпотентности
и проверяет, что второй ответ совпадает с сохранённым. Затем запускает настоящий
обработчик outbox, подтверждает одну доставку, проверяет, что при втором проходе
больше нечего захватывать, и читает состояние доставки через RPC.

Smoke-тест Compose повторяет это поведение через упакованные сервисы базы,
миграций, API и фонового процесса. Отдельные модульные и интеграционные тесты
проверяют повторы, истечение времени владения, защиту токеном захвата, состояние
после исчерпания попыток, сроки хранения, контрольные суммы миграций и конфликты
ключей идемпотентности.

Пример не моделирует предметную область или внешнего провайдера. Он сохраняет
проверяемость инварианта состояния, идемпотентности и outbox до тех пор, пока
настоящий сценарий продукта не заменит его с равноценным покрытием.
