# Where to put code

| Новый код | Место |
| --- | --- |
| RPC input/output schema | `packages/contracts/src` |
| Product domain rule | `apps/api/src/modules/<capability>/domain` |
| Backend use case | `apps/api/src/modules/<capability>/application` |
| Nest controller/DI | `apps/api/src/modules/<capability>/transport` |
| Runtime config/bootstrap/health | `apps/api/src/app` |
| Product repository implementation | capability infrastructure, за application port |
| Product SQL migration | `apps/api/migrations` |
| React page | `packages/frontend-app/src/pages` |
| User action/workflow | `packages/frontend-app/src/features` |
| Product model | `packages/frontend-app/src/entities` |
| Большой UI block | `packages/frontend-app/src/widgets` |
| Общий transport/UI/config helper | `packages/frontend-app/src/shared` |
| Web-only bootstrap | `apps/web` |
| Capacitor integration | `apps/mobile` |
| Tauri integration | `apps/desktop` |
| Product-neutral backend port | `packages/backend-core` только при реальном повторном использовании |
| PostgreSQL foundation adapter | `packages/backend-postgres` |
| Product repository adapter | `apps/api/src/modules/<name>/infrastructure` |
| Архитектурное решение | `docs/adr` |

## Быстрая проверка

Перед добавлением файла ответьте:

1. Кто владеет этим поведением?
2. Это продуктовая логика или технический механизм?
3. Какой самый высокий слой может владеть кодом без нарушения направления зависимостей?
4. Нужен ли общий abstraction сейчас, или есть только один consumer?

Не кладите бизнес-правило в `shared`, contract или controller. Не кладите
framework/database object в domain. Если owner неясен, сначала уточните
capability, а не создавайте `utils` или `common/services`.
