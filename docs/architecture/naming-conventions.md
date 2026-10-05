# Naming conventions

[Русская версия](./naming-conventions-RU.md)

- Directories and files: `kebab-case`.
- Functions and variables: `camelCase`.
- Types, classes and components: `PascalCase`.
- Constants and DI tokens: `UPPER_SNAKE_CASE`.
- Package names: `@app/<name>` or `@product-foundation/<name>`.
- RPC ID: `<capability>.<action>`, for example `billing.createCheckout`.
- RPC path: `/rpc/v1/<kebab-case-action>`.
- Event type: `<capability>.<event>.v<version>`.
- SQL: `snake_case`, plural table names and explicit constraint/index names.
- Environment variables: `UPPER_SNAKE_CASE`.
- Boolean names start with `is`, `has`, `can` or `should`.
- Commands and use cases use a verb: `createDocument`, `inviteMember`.
- Domain types use a noun: `Document`, `TenantScope`.

Do not use an `I` prefix for interfaces or vague names such as `Manager`, `Helper`,
`Utils`, `Common` or `Service`. Names should explain responsibility.

Prefer matching names for a file and its main export:

```text
ping-system.ts               → pingSystem
system-ping-rpc.controller.ts → SystemPingRpcController
document-repository.ts       → DocumentRepository
```
