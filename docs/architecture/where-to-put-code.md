# Куда класть новый код

## Зачем нужен этот файл

Этот документ нужен как практическая шпаргалка.

Если `current-architecture-explained.md` объясняет, как устроен проект в целом, то этот файл отвечает на более приземленный вопрос:

> "Я сейчас пишу новую штуку. Куда именно ее положить?"

---

## Сначала главный вопрос

Перед тем как создавать файл, задайте себе три вопроса:

1. Это часть исполняемого приложения или переиспользуемый код?
2. Это frontend, backend или общая граница между ними?
3. Это платформенная специфика или продуктовая логика?

Обычно этого уже хватает, чтобы выбрать правильное место.

---

## Самое короткое правило

Если совсем кратко:

* `apps/*` — то, что запускается
* `packages/*` — то, что переиспользуется
* `packages/contracts` — общая граница frontend/backend
* `packages/frontend-app` — основной frontend продукта
* `apps/api` — backend

---

## Куда класть frontend-код

Почти весь продуктовый frontend-код нужно класть в:

```txt
packages/frontend-app
```

Не в `apps/web`, не в `apps/mobile`, не в `apps/desktop`.

Shell-приложения должны оставаться тонкими.

### Клади в `packages/frontend-app`, если это:

* экран
* виджет
* пользовательский сценарий
* работа с query/mutation
* presentation model
* доменная frontend-логика
* shared UI infrastructure

### Не клади в `apps/web`, `apps/mobile`, `apps/desktop`, если это:

* общая бизнес-логика
* GTD-правила
* общий экран
* общий widget
* общий feature flow

---

## Как выбрать слой во frontend

Внутри `packages/frontend-app/src` используйте такую логику.

### `app`

Кладем сюда:

* bootstrap
* router
* providers
* верхнеуровневую композицию приложения

Не кладем сюда:

* бизнес-логику фич
* детали конкретных страниц

### `pages`

Кладем сюда:

* сборку экранов
* page-level composition

Хорошие примеры:

* `task-list-page`
* `project-details-page`
* `weekly-review-page`

Если код описывает целую страницу, это чаще всего `pages`.

### `widgets`

Кладем сюда:

* крупные составные UI-блоки
* панели
* таблицы
* filter blocks
* dashboard sections

Пример:

* `task-table`
* `inbox-panel`
* `today-focus-widget`

Если это крупный блок, который собирает сущности и фичи, это обычно `widgets`.

### `features`

Кладем сюда:

* действия пользователя
* сценарии
* workflow
* use-case oriented frontend logic

Примеры:

* `create-task`
* `clarify-inbox-item`
* `complete-task`
* `run-weekly-review`

Если код отвечает на вопрос "что пользователь делает?", это почти всегда `features`.

### `entities`

Кладем сюда:

* доменную модель на frontend
* presentation-ориентированные доменные куски
* UI для сущности
* маппинг DTO -> model, когда это относится к самой сущности

Примеры:

* `task`
* `project`
* `context`
* `area`

Если код отвечает на вопрос "о какой бизнес-сущности идет речь?", это обычно `entities`.

### `shared`

Кладем сюда:

* UI primitives
* api client
* query keys
* platform adapters
* config
* общие технические utils

Не кладем сюда:

* GTD workflow
* бизнес-правила
* feature-specific логику

Если код технический и не принадлежит конкретной бизнес-сущности, это кандидат в `shared`.

---

## Когда код должен попасть в shell-приложение

`apps/web`, `apps/mobile`, `apps/desktop` нужны только для платформенной обвязки.

### Клади в `apps/web`, если это:

* web entrypoint
* web-specific env wiring
* Vite integration
* browser-only bootstrap

### Клади в `apps/mobile`, если это:

* Capacitor config
* mobile native plugin wiring
* mobile packaging setup
* mobile-specific integration

### Клади в `apps/desktop`, если это:

* Tauri setup
* desktop lifecycle integration
* filesystem or window integration для desktop

Простое правило:

если код перестанет иметь смысл вне конкретной платформы, его можно класть в shell.

Если код одинаково нужен на web, mobile и desktop, его место не в shell, а в `packages/frontend-app`.

---

## Куда класть backend-код

Весь backend-код идет в:

```txt
apps/api
```

Внутри backend базовая логика выбора такая:

```txt
src/
  app/
  modules/
  shared/
```

### `src/app`

Кладем сюда:

* server bootstrap
* RPC app creation
* env wiring
* registration of modules

Не кладем сюда:

* use cases
* domain rules
* feature-specific transport logic, размазанную по всему app

### `src/modules`

Это главное место для backend-фич.

Если вы добавляете новую бизнес-область, почти наверняка нужно создавать новый модуль здесь.

Примеры будущих модулей:

* `tasks`
* `projects`
* `inbox`
* `auth`
* `reviews`

### `src/shared`

Кладем сюда:

* backend-wide helpers
* infrastructure adapters
* technical primitives
* общие error helpers

Не кладем сюда:

* feature-specific policies
* use cases
* доменные правила конкретного модуля

---

## Как выбрать слой внутри backend-модуля

Внутри `apps/api/src/modules/<module>` используйте такую логику:

### `contract`

Кладем сюда:

* boundary types
* re-export shared contracts
* module-level contract helpers

Если это общая форма данных между frontend и backend, чаще всего источник должен быть в `packages/contracts`.

### `domain`

Кладем сюда:

* чистые правила предметной области
* инварианты
* вычисления
* бизнесовые проверки

Не кладем сюда:

* Hono context
* tRPC context
* HTTP details
* database calls

### `application`

Кладем сюда:

* use cases
* orchestration
* permission checks
* coordination between repositories and domain logic

Если код отвечает на вопрос "как выполняется сценарий целиком?", это обычно `application`.

### `transport`

Кладем сюда:

* Hono handlers
* tRPC procedures
* request/response adaptation
* transport-level parsing

Если код знает про RPC framework, он почти наверняка должен жить именно здесь.

---

## Куда класть shared contracts

Общие типы и схемы API кладем в:

```txt
packages/contracts
```

Это место подходит для:

* request types
* response types
* shared enums
* DTO
* schema at the boundary

Это место не подходит для:

* frontend UI
* backend repositories
* server-only internals
* бизнес-логики

Простое правило:

если один и тот же shape нужен и frontend, и backend, его место в `packages/contracts`.

---

## Куда класть конфиги

Общие конфиги, которые будут использовать разные части монорепы, кладем в:

```txt
packages/config
```

Например:

* base tsconfig
* shared eslint config
* shared tooling presets

Если конфиг нужен только одному приложению, он должен жить рядом с этим приложением.

---

## Типовые примеры

### Пример 1: новая страница списка задач

Куда:

* `packages/frontend-app/src/pages/task-list`

Почему:

* это page-level composition

### Пример 2: форма создания задачи

Куда:

* `packages/frontend-app/src/features/create-task`

Почему:

* это пользовательское действие и workflow

### Пример 3: карточка проекта

Куда:

* `packages/frontend-app/src/entities/project`

Почему:

* это код вокруг конкретной сущности

### Пример 4: общая таблица задач с фильтрами и bulk actions

Куда:

* `packages/frontend-app/src/widgets/task-table`

Почему:

* это крупный составной UI-блок

### Пример 5: query keys для задач

Куда:

* `packages/frontend-app/src/shared/api/queryKeys`

Почему:

* это shared frontend infrastructure

### Пример 6: RPC endpoint для задач

Куда:

* `apps/api/src/modules/tasks/transport`

Почему:

* это transport edge backend-модуля

### Пример 7: use case "complete task"

Куда:

* `apps/api/src/modules/tasks/application`

Почему:

* это application-level orchestration

### Пример 8: правило "задачу нельзя завершить без next action"

Куда:

* `apps/api/src/modules/tasks/domain`
* возможно часть frontend-domain модели в `entities/task`, если это нужно для UI-представления

Почему:

* это бизнес-правило, а не transport detail

### Пример 9: общий request/response shape для task details

Куда:

* `packages/contracts`

Почему:

* это shared boundary between frontend and backend

### Пример 10: Capacitor share integration

Куда:

* `apps/mobile`
* при необходимости адаптерный интерфейс в `packages/frontend-app/src/shared/lib/platform`

Почему:

* это platform-specific wiring

---

## Антипримеры

Вот куда класть код обычно не нужно.

### Не складывайте продуктовую логику в `apps/web`

Плохо:

* страница задач живет только в `apps/web`

Почему плохо:

* потом mobile и desktop начнут дублировать тот же код

### Не складывайте бизнес-правила в `packages/contracts`

Плохо:

* helper, который решает GTD workflow, лежит рядом с DTO

Почему плохо:

* contracts перестают быть границей и начинают тянуть на себя application logic

### Не превращайте `shared` в свалку

Плохо:

* любой непонятный код автоматически уезжает в `shared`

Почему плохо:

* размывается ownership
* появляется скрытый второй слой приложения

### Не кладите Hono/tRPC детали в `domain`

Плохо:

* domain function принимает framework context

Почему плохо:

* transport начинает протекать в core backend-логику

---

## Что делать, если место неочевидно

Если непонятно, куда положить код, пройдите по такому порядку:

1. Это исполняемое приложение или shared package?
2. Это frontend, backend или contract boundary?
3. Это бизнес-смысл или техническая инфраструктура?
4. Это user action, entity, widget или page?
5. Это platform-specific код или общий продуктовый код?

Если после этого все еще неясно, обычно верный выбор такой:

* для frontend-кода держаться ближе к `features` или `entities`, а не уносить всё в `shared`
* для backend-кода держаться ближе к модулю, а не уносить всё в `src/shared`

---

## Что читать вместе с этим файлом

Для общей картины:

1. [docs/architecture/current-architecture-explained.md](file:///c:/server/pets/GTD-Planer/docs/architecture/current-architecture-explained.md)
2. [docs/architecture/monorepo-layout.md](file:///c:/server/pets/GTD-Planer/docs/architecture/monorepo-layout.md)
3. [docs/architecture/hello-world-flow.md](file:///c:/server/pets/GTD-Planer/docs/architecture/hello-world-flow.md)

Для строгих правил:

1. [AGENTS.md](file:///c:/server/pets/GTD-Planer/AGENTS.md)
2. [packages/frontend-app/AGENTS.md](file:///c:/server/pets/GTD-Planer/packages/frontend-app/AGENTS.md)
3. [apps/api/AGENTS.md](file:///c:/server/pets/GTD-Planer/apps/api/AGENTS.md)
