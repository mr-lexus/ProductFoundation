# Куда добавлять код

[English version](./where-to-put-code.md)

| Новый код | Место |
| --- | --- |
| Схема входа или выхода RPC | `packages/contracts/src` |
| Правило предметной области | `apps/api/src/modules/<capability>/domain` |
| Серверный сценарий | `apps/api/src/modules/<capability>/application` |
| Контроллер Nest или внедрение зависимостей | `apps/api/src/modules/<capability>/transport` |
| Конфигурация, запуск, проверки работоспособности | `apps/api/src/app` |
| Реализация репозитория продукта | Слой infrastructure своего модуля, за интерфейсом из application |
| SQL-миграция продукта | `apps/api/migrations` |
| Страница React | `packages/frontend-app/src/pages` |
| Действие пользователя или сценарий | `packages/frontend-app/src/features` |
| Модель продукта | `packages/frontend-app/src/entities` |
| Крупный блок интерфейса | `packages/frontend-app/src/widgets` |
| Общий код транспорта, интерфейса или конфигурации | `packages/frontend-app/src/shared` |
| Запуск только для браузера | `apps/web` |
| Интеграция с Capacitor | `apps/mobile` |
| Интеграция с Tauri | `apps/desktop` |
| Универсальный серверный интерфейс | `packages/backend-core`, только при реальном повторном использовании |
| Адаптер PostgreSQL для основы | `packages/backend-postgres` |
| Адаптер репозитория продукта | `apps/api/src/modules/<name>/infrastructure` |
| Архитектурное решение | `docs/adr` |

## Быстрая проверка

Перед добавлением файла ответьте:

1. Кто отвечает за это поведение?
2. Это логика продукта или технический механизм?
3. Какой самый высокий слой может владеть кодом без нарушения направления зависимостей?
4. Общая абстракция нужна уже сейчас или пока есть только один потребитель?

Не помещайте бизнес-правила в `shared`, контракты или контроллеры, а объекты
фреймворка и базы данных — в domain. Если ответственность неясна, сначала
определите функциональный модуль, а не создавайте `utils` или `common/services`.
