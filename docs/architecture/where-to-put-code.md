# Where to put code

[Русская версия](./where-to-put-code-RU.md)

| New code | Location |
| --- | --- |
| RPC input/output schema | `packages/contracts/src` |
| Product domain rule | `apps/api/src/modules/<capability>/domain` |
| Backend use case | `apps/api/src/modules/<capability>/application` |
| Nest controller/DI | `apps/api/src/modules/<capability>/transport` |
| Runtime config/bootstrap/health | `apps/api/src/app` |
| Product repository implementation | Capability infrastructure, behind an application port |
| Product SQL migration | `apps/api/migrations` |
| React page | `packages/frontend-app/src/pages` |
| User action/workflow | `packages/frontend-app/src/features` |
| Product model | `packages/frontend-app/src/entities` |
| Large UI block | `packages/frontend-app/src/widgets` |
| Shared transport/UI/config helper | `packages/frontend-app/src/shared` |
| Web-only bootstrap | `apps/web` |
| Capacitor integration | `apps/mobile` |
| Tauri integration | `apps/desktop` |
| Product-neutral backend port | `packages/backend-core`, only for actual reuse |
| Foundation PostgreSQL adapter | `packages/backend-postgres` |
| Product repository adapter | `apps/api/src/modules/<name>/infrastructure` |
| Architecture decision | `docs/adr` |

## Quick check

Before adding a file, answer:

1. Who owns this behavior?
2. Is it product logic or a technical mechanism?
3. What is the highest layer that can own it without reversing dependency direction?
4. Is a shared abstraction needed now, or is there only one consumer?

Do not put business rules in `shared`, contracts or controllers. Do not put framework
or database objects in domain code. If ownership is unclear, identify the capability
before creating `utils` or `common/services`.
