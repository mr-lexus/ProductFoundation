# Правила именования

[English version](./naming-conventions.md)

- Каталоги и файлы: `kebab-case`.
- Функции и переменные: `camelCase`.
- Типы, классы и компоненты: `PascalCase`.
- Константы и токены внедрения зависимостей: `UPPER_SNAKE_CASE`.
- Имена пакетов: `@app/<name>` или `@product-foundation/<name>`.
- Идентификатор RPC: `<capability>.<action>`, например `billing.createCheckout`.
- Путь RPC: `/rpc/v1/<kebab-case-action>`.
- Тип события: `<capability>.<event>.v<version>`.
- SQL: `snake_case`, имена таблиц во множественном числе, явные имена ограничений и индексов.
- Переменные окружения: `UPPER_SNAKE_CASE`.
- Имена булевых значений начинаются с `is`, `has`, `can` или `should`.
- Команды и сценарии начинаются с глагола: `createDocument`, `inviteMember`.
- Типы предметной области называются существительными: `Document`, `TenantScope`.

Не используйте префикс `I` для интерфейсов и расплывчатые имена вроде `Manager`,
`Helper`, `Utils`, `Common` или `Service`. Имя должно объяснять ответственность.

Файл и его главный экспорт желательно называть одинаково:

```text
ping-system.ts               → pingSystem
system-ping-rpc.controller.ts → SystemPingRpcController
document-repository.ts       → DocumentRepository
```
