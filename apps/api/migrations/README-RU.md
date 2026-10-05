# Миграции продукта

[English version](./README.md)

Размещайте здесь SQL-миграции продукта с именами вроде
`0001_create_accounts.sql`. Они выполняются после миграций основы
в постоянном пространстве имён из `PRODUCT_MIGRATION_NAMESPACE`.

Никогда не редактируйте миграцию после применения. Миграции основы
остаются в `packages/backend-postgres/migrations`.
