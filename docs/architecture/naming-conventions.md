# Naming conventions

- каталоги и файлы: `kebab-case`;
- функции и переменные: `camelCase`;
- types/classes/components: `PascalCase`;
- constants и DI tokens: `UPPER_SNAKE_CASE`;
- package names: `@app/<name>` или `@product-foundation/<name>`;
- RPC id: `<capability>.<action>`, например `billing.createCheckout`;
- RPC path: `/rpc/v1/<kebab-case-action>`;
- event type: `<capability>.<event>.v<version>`;
- SQL: `snake_case`, plural table names, explicit constraint/index names;
- environment variables: `UPPER_SNAKE_CASE`;
- boolean names начинаются с `is`, `has`, `can` или `should`;
- commands/use cases используют глагол: `createDocument`, `inviteMember`;
- domain types используют существительное: `Document`, `WorkspaceScope`.

Не используйте `I`-prefix для interfaces, `Manager`, `Helper`, `Utils`, `Common`
или `Service` без конкретного смысла. Имя должно объяснять ответственность.

Файл и главный export желательно называют одинаково:

```text
ping-system.ts            → pingSystem
system-ping-rpc.controller.ts → SystemPingRpcController
document-repository.ts    → DocumentRepository
```
