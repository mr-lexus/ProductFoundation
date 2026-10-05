# Требования к изоляции арендаторов

[English version](./tenant-isolation.md)

В режиме `DATA_SCOPE_MODE=tenant` продуктовые модули получают только
`TenantTransactionRunner`, который устанавливает `app.tenant_id` на время
транзакции. Этот контекст необходим, но сам по себе не обеспечивает защиту
данных в базе.

Надёжные RPC-мутации устанавливают тот же контекст арендатора из
`OperationScope` внутри транзакции идемпотентности, до работы с состоянием
продукта и outbox. Журнал идемпотентности, изменения продукта, проверенный ответ
и outbox остаются одной атомарной транзакцией в области арендатора.
Обработчики мутаций не должны открывать вложенную tenant-транзакцию.

Чтобы считать изоляцию обеспеченной, каждая принадлежащая арендатору таблица
продукта должна:

1. иметь обязательный столбец владельца `tenant_id uuid`;
2. включать и **принудительно применять** PostgreSQL Row-Level Security;
3. определять политики `USING` и `WITH CHECK` на основе `app.tenant_id`;
4. использовать рабочую роль базы без прав суперпользователя;
5. проходить `assertTenantRelationsSecure` при запуске, проверке готовности
   или в интеграционных тестах;
6. иметь тесты запрета чтения и записи между арендаторами под рабочей ролью.

Минимальный пример миграции:

```sql
ALTER TABLE app.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.documents FORCE ROW LEVEL SECURITY;

CREATE POLICY documents_tenant_scope
ON app.documents
USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
```

Минимальная проверка:

```ts
await assertTenantRelationsSecure(database, [
  { schema: "app", table: "documents" }
]);
```

`assertTenantRelationsSecure` проверяет существование таблицы, включённый
и принудительный RLS и наличие хотя бы одной политики. Она не определяет,
правильно ли политика отражает принадлежность данных в продукте, поэтому
негативные тесты доступа между арендаторами обязательны.

Не запускайте такие продукты с суперпользователем PostgreSQL: он обходит RLS.
При `DATA_SCOPE_MODE=tenant` API проверяет роль через
`assertTenantRuntimeRoleSafe` и отклоняет роли с `SUPERUSER` или `BYPASSRLS`.
