# Foundation boundaries

Репозиторий состоит из двух уровней ownership.

## `@product-foundation/*`

Техническое ядро без продуктовой предметной области:

| Package | Ответственность |
| --- | --- |
| `rpc` | protocol, envelopes, errors, procedure definition |
| `rpc-client` | fetch, cancellation, output validation |
| `rpc-server` | input/output validation и handler execution |
| `backend-core` | auth/tenant ports, transactions, outbox worker |
| `backend-postgres` | `pg` adapters и foundation migrations |
| `config` | общие tooling presets |

Foundation не импортирует `@app/*`, React, NestJS composition или продуктовые
контракты. `backend-postgres` — единственное место с прямым импортом `pg`.

## `@app/*`

Заменяемый слой будущего продукта:

- публичные product contracts;
- backend capabilities и NestJS composition;
- общий frontend и platform shells;
- product migrations и permission vocabulary;
- deployment configuration и observability labels.

Зависимости направлены только `@app/* → @product-foundation/*`.

Пакеты остаются private workspace packages. Болванка копируется целиком, поэтому
registry, публикация и semver внутренних packages не нужны.
