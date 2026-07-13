# ADR 0001: Modular monolith first

- Status: Accepted
- Date: 2026-07-11

## Context

Starter должен подходить для разных продуктов и большого числа пользователей.
Команда может состоять в том числе из AI-агентов. Ранние микросервисы увеличат
число deploy units, distributed
transactions, contracts и наблюдаемость раньше, чем появятся измеренные
границы нагрузки.

## Decision

Backend разворачивается как модульный монолит. Бизнес-код организован по
capabilities, модули общаются через явные application APIs, а не через таблицы
друг друга. Один process может иметь отдельный worker entrypoint, но использует
те же модули и contracts.

PostgreSQL становится source of truth после ADR по persistence. Асинхронные
эффекты публикуются через transactional outbox. Search, notifications и
realtime являются projections/consumers, а не владельцами canonical data.

## Consequences

Плюсы:

- атомарные транзакции для product workflows;
- простой local development и deployment;
- границы остаются видимыми и тестируемыми;
- модуль можно выделить позже по измеренной причине.

Минусы:

- требуется дисциплина импортов и ownership;
- тяжёлые workloads должны иметь отдельные queues/read models;
- одна база требует tenant-aware indexes и migration discipline.

Выделение сервиса разрешено только при наличии владельца, независимого scale или
security boundary, измеренной проблемы и плана data ownership.
