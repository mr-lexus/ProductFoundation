# Naming Conventions

## Зачем нужен этот файл

Этот документ фиксирует базовые правила именования в проекте.

Он нужен для того, чтобы:

* структура репозитория читалась одинаково всеми
* новые папки и модули назывались предсказуемо
* frontend и backend не расходились по стилю
* AI и люди создавали файлы в одном и том же формате

Цель не в том, чтобы формально запретить все нестандартное.

Цель в том, чтобы по имени было сразу понятно:

* что это
* где оно живет
* какой у него уровень ответственности

---

## Базовое правило

По умолчанию используем:

* для папок: `kebab-case`
* для файлов с несколькими словами: `kebab-case`
* для TypeScript-типов, интерфейсов, классов, React-компонентов: `PascalCase`
* для функций и переменных: `camelCase`
* для констант верхнего уровня: `UPPER_SNAKE_CASE`, только если это действительно константа

Если нет сильной причины делать иначе, придерживаемся именно этого.

---

## Именование папок в монорепе

### `apps/*`

Имена приложений должны быть короткими, буквальными и стабильными.

Хорошо:

* `web`
* `mobile`
* `desktop`
* `api`

Плохо:

* `frontend-main-app`
* `main-backend-server`
* `mobile-client-final`

Причина:

имя верхнего уровня должно быстро объяснять роль приложения, а не его историю.

### `packages/*`

Имена пакетов должны отражать ownership и назначение.

Хорошо:

* `frontend-app`
* `contracts`
* `config`

Плохо:

* `common`
* `utils`
* `shared-stuff`
* `core`

Причина:

слишком общие названия быстро превращаются в свалку.

---

## Именование frontend slice-папок

Во frontend используем `kebab-case`.

### Для `features`

Имя feature должно отвечать на вопрос:

> "Что делает пользователь?"

Хорошо:

* `create-task`
* `complete-task`
* `clarify-inbox-item`
* `run-weekly-review`

Плохо:

* `task-actions`
* `task-utils`
* `task-stuff`
* `weekly`

Причина:

feature должна быть названа как действие или сценарий, а не как размытая категория.

### Для `entities`

Имя entity должно быть существительным из предметной области.

Хорошо:

* `task`
* `project`
* `inbox-item`
* `context`
* `area`

Плохо:

* `task-data`
* `task-models`
* `project-shared`

Причина:

entity уже сама по себе обозначает предметную сущность. Не нужно дублировать это в названии.

### Для `widgets`

Имя widget должно описывать крупный UI-блок, а не случайный набор компонентов.

Хорошо:

* `task-table`
* `inbox-panel`
* `today-focus-widget`
* `weekly-review-summary`

Плохо:

* `task-components`
* `dashboard-stuff`
* `main-widget`

Причина:

по имени должно быть понятно, что этот блок визуально и функционально делает.

### Для `pages`

Имя page должно обозначать экран или route-level смысл.

Хорошо:

* `task-list`
* `task-details`
* `project-details`
* `weekly-review`

Допустимо:

* `task-list-page`
* `project-details-page`

Рекомендуемый вариант:

* без лишнего суффикса `-page`, если и так ясно, что это лежит в `pages`

Плохо:

* `page1`
* `main`
* `screen-stuff`

---

## Именование backend-модулей

Backend-модули в `apps/api/src/modules` называются по бизнес-областям.

Используем `kebab-case`.

Хорошо:

* `tasks`
* `projects`
* `inbox`
* `auth`
* `reviews`

Если модуль действительно более точечный:

* `weekly-review`
* `task-recurrence`

Плохо:

* `task-module`
* `project-logic`
* `common-services`
* `helpers`

Причина:

имя модуля должно отвечать на вопрос:

> "Какую бизнес-область он обслуживает?"

---

## Именование слоев внутри backend-модуля

Слои называются строго и одинаково:

* `contract`
* `domain`
* `application`
* `transport`

Не нужно изобретать альтернативы вроде:

* `contracts`
* `services`
* `usecases`
* `delivery`
* `adapter-layer`

Причина:

стабильные названия делают структуру предсказуемой и понятной без дополнительных объяснений.

---

## Именование файлов во frontend

### Общий принцип

Имя файла должно описывать содержимое, а не быть абстрактным контейнером.

Хорошо:

* `create-hello-world-page.ts`
* `get-hello-world.ts`
* `platform.ts`
* `hello-world.ts`

Плохо:

* `helpers.ts`
* `utils.ts`
* `index2.ts`
* `temp.ts`

### Для React-компонентов

Когда появятся реальные React-компоненты, лучше использовать имя компонента в `PascalCase`, если это один основной компонент в файле.

Например:

* `TaskCard.tsx`
* `InboxPanel.tsx`
* `WeeklyReviewPage.tsx`

Если в проекте будет выбран более строгий файловый стиль с `kebab-case` и отдельным export-именем, это нужно будет зафиксировать отдельно.

На текущем этапе важно не смешивать оба стиля хаотично внутри одной зоны.

### Для hooks

Имена hooks должны начинаться с `use`.

Хорошо:

* `use-task-filters.ts`
* `use-weekly-review.ts`
* `use-project-query.ts`

Имена экспортируемых хуков:

* `useTaskFilters`
* `useWeeklyReview`
* `useProjectQuery`

Плохо:

* `task-hook.ts`
* `hook.ts`
* `review-helper.ts`

### Для query и mutation логики

В имени должно быть видно намерение.

Хорошо:

* `use-task-list-query.ts`
* `use-complete-task-mutation.ts`
* `get-project-details.ts`

Плохо:

* `queries.ts`
* `api.ts`
* `task-data.ts`

---

## Именование файлов в backend

### Для use cases

Файл должен называться по действию.

Хорошо:

* `get-task-details.ts`
* `create-task.ts`
* `complete-task.ts`
* `run-weekly-review.ts`

Плохо:

* `task-service.ts`
* `task-logic.ts`
* `task-manager.ts`

Причина:

use case должен быть явным действием, а не размытой сервисной сущностью.

### Для domain-функций

Имя должно описывать конкретное правило или вычисление.

Хорошо:

* `create-hello-world-message.ts`
* `calculate-review-status.ts`
* `validate-next-action.ts`

Плохо:

* `task-domain.ts`
* `rules.ts`
* `helpers.ts`

### Для transport-адаптеров

Имя должно показывать, что это boundary adapter.

Хорошо:

* `create-hello-world-rpc-handler.ts`
* `complete-task-procedure.ts`
* `get-project-details-route.ts`

Плохо:

* `rpc.ts`
* `handlers.ts`
* `transport.ts`

---

## Именование TypeScript-сущностей

### Интерфейсы и типы

Используем `PascalCase`.

Хорошо:

* `HelloWorldResponse`
* `CreateTaskInput`
* `TaskCardModel`
* `FrontendPlatformConfig`

Плохо:

* `hello_world_response`
* `taskcardmodel`
* `IHelloWorldResponse`

Рекомендация:

не использовать префикс `I` для интерфейсов без реальной причины.

### Функции

Используем `camelCase`.

Хорошо:

* `createFrontendApp`
* `getHelloWorld`
* `createRpcApp`
* `createHelloWorldViewModel`

### Константы

Для обычных локальных констант используем `camelCase`.

`UPPER_SNAKE_CASE` используем только для действительно глобальных и стабильных констант.

Хорошо:

* `defaultPageSize`
* `helloWorldTitle`
* `MAX_PAGE_SIZE`

Плохо:

* `TASKS = []` для обычной локальной переменной

---

## Именование public API файлов

Для slice public API используем:

```txt
index.ts
```

Это касается прежде всего:

* `entities/*/index.ts`
* `features/*/index.ts`
* package entrypoints

Не нужно придумывать альтернативы вроде:

* `public.ts`
* `exports.ts`
* `main.ts`

Если нужна публичная точка входа, используем стандартный `index.ts`.

---

## Именование shared contracts

В `packages/contracts` имена должны описывать boundary shapes.

Хорошо:

* `hello-world.ts`
* `task-details.ts`
* `create-task.ts`

Если в одном файле лежит конкретный контракт сценария, имя должно отражать именно этот сценарий.

Избегаем слишком общих имен:

* `types.ts`
* `dto.ts`
* `common.ts`

Причина:

по имени файла должно быть понятно, какой boundary shape внутри лежит.

---

## Что делать, если название получается слишком длинным

Если имя стало длинным, это не всегда плохо.

Лучше длинное, но понятное имя, чем короткое и расплывчатое.

Например:

* `use-complete-task-mutation.ts` лучше, чем `task.ts`
* `run-weekly-review.ts` лучше, чем `review.ts`

Но если имя стало слишком длинным, это повод проверить:

* не делает ли файл слишком много
* не перепутаны ли уровни ответственности
* не нужно ли разбить use case на более узкие части

---

## Когда можно отступить от правил

Отступления допустимы, если:

* этого требует tooling
* этого требует framework convention
* без этого ухудшается читаемость

Но отступление должно быть редким и осознанным.

Нельзя, чтобы внутри одной зоны проекта одновременно хаотично жили:

* `task-list.ts`
* `TaskList.tsx`
* `taskList.ts`
* `task_list.ts`

Даже если каждый вариант сам по себе допустим, вместе они создают визуальный шум и путаницу.

---

## Краткая памятка

Если совсем коротко:

* папки: `kebab-case`
* frontend feature names: действие
* frontend entity names: сущность
* frontend widget names: крупный UI-блок
* backend module names: бизнес-область
* backend use case file names: действие
* types/interfaces/components: `PascalCase`
* functions/variables: `camelCase`
* public API: `index.ts`

---

## Что читать вместе с этим файлом

1. [docs/architecture/current-architecture-explained.md](file:///c:/server/pets/GTD-Planer/docs/architecture/current-architecture-explained.md)
2. [docs/architecture/where-to-put-code.md](file:///c:/server/pets/GTD-Planer/docs/architecture/where-to-put-code.md)
3. [AGENTS.md](file:///c:/server/pets/GTD-Planer/AGENTS.md)
4. [packages/frontend-app/AGENTS.md](file:///c:/server/pets/GTD-Planer/packages/frontend-app/AGENTS.md)
5. [apps/api/AGENTS.md](file:///c:/server/pets/GTD-Planer/apps/api/AGENTS.md)
