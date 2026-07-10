# Текущая архитектура проекта

## Зачем это все

Сейчас репозиторий организован как `monorepo`.

Это значит, что в одном репозитории живут:

* frontend-приложение
* backend-приложение
* платформенные оболочки для web, mobile и desktop
* общие пакеты с контрактами и конфигами

Главная идея архитектуры:

* продукт пишется один раз
* платформенные различия выносятся в тонкие оболочки
* frontend и backend имеют разные правила
* общие типы и API-контракты живут отдельно

Иными словами, мы не хотим делать три почти одинаковых фронтенда для браузера, мобильного приложения и десктопа.

---

## Как читать репозиторий

Базовая структура сейчас такая:

```txt
apps/
  web/
  mobile/
  desktop/
  api/

packages/
  frontend-app/
  contracts/
  config/

docs/
  adr/
  architecture/
```

Это делится на две большие зоны:

1. `apps` — исполняемые приложения
2. `packages` — переиспользуемые части

---

## Что такое `apps`

Папка `apps` содержит конечные приложения, которые реально запускаются.

### `apps/web`

Это браузерная оболочка.

Тут со временем будут:

* web entrypoint
* Vite-конфиг
* подключение shared frontend app
* web-специфичная инициализация

### `apps/mobile`

Это mobile-оболочка для Capacitor.

Тут будут жить:

* Capacitor config
* iOS/Android wiring
* mobile-специфичные интеграции
* подключение shared frontend app

### `apps/desktop`

Это desktop-оболочка для Tauri.

Тут будут жить:

* Tauri config
* desktop lifecycle
* desktop-специфичные интеграции
* подключение shared frontend app

### `apps/api`

Это backend.

Он развивается отдельно от frontend и имеет собственные архитектурные правила.

Тут будет:

* серверный bootstrap
* RPC transport
* backend-модули
* доступ к данным
* серверная бизнес-логика

---

## Что такое `packages`

Папка `packages` содержит общие части, которые не должны быть привязаны к одному конкретному приложению.

### `packages/frontend-app`

Это главный shared frontend package.

Именно здесь живет продуктовая frontend-логика, которую будут использовать:

* `apps/web`
* `apps/mobile`
* `apps/desktop`

То есть:

* страницы
* виджеты
* фичи
* сущности
* shared frontend infrastructure

Это основной frontend-код проекта.

### `packages/contracts`

Это общая граница между frontend и backend.

Тут должны лежать:

* request types
* response types
* DTO
* shared enums
* схемы валидации на границах API

Важно: здесь не должна жить бизнес-логика приложения.

`contracts` нужен, чтобы frontend и backend смотрели на одни и те же формы данных.

### `packages/config`

Это место для общих конфигов.

Например:

* базовый `tsconfig`
* общие lint rules
* shared tooling presets

---

## Почему frontend вынесен в `packages/frontend-app`

Это ключевое решение текущей архитектуры.

Мы считаем, что продукт в первую очередь пишется как один frontend, а не как три разных клиента.

Поэтому:

* общая UI и продуктовая логика живет в `packages/frontend-app`
* web/mobile/desktop только подключают ее
* платформенная специфика не должна растаскивать основную бизнес-логику по разным `apps/*`

Это дает несколько плюсов:

* меньше дублирования
* легче держать одинаковое поведение на всех платформах
* проще сопровождать GTD-логику
* проще менять архитектуру централизованно

---

## Как устроен frontend внутри `packages/frontend-app`

Frontend сейчас ориентирован на облегченный FSD-подход.

Структура:

```txt
src/
  app/
  pages/
  widgets/
  features/
  entities/
  shared/
```

Смысл слоев:

### `app`

Самый верхний слой frontend.

Здесь живут:

* bootstrap
* router
* providers
* общая композиция приложения

### `pages`

Слой страниц.

Здесь собираются экраны из виджетов, фич и сущностей.

### `widgets`

Крупные UI-блоки.

Например:

* панели
* таблицы
* dashboard-секции
* составные визуальные блоки

### `features`

Слой пользовательских действий и workflow.

Например:

* создание задачи
* обработка inbox
* completion
* review flow

### `entities`

Бизнесовые сущности предметной области.

Например:

* task
* project
* inbox-item
* context

### `shared`

Общая frontend-инфраструктура.

Например:

* UI kit
* api client
* query keys
* config
* utils

Главное правило здесь: зависимости идут только сверху вниз.

То есть `pages` могут использовать `widgets`, `features`, `entities`, `shared`, но не наоборот.

---

## Как устроен backend

Backend пока закладывается как RPC-first архитектура.

Транспорт планируется через:

* `Hono RPC`, или
* `tRPC`

Но важная идея не в выборе библиотеки, а в том, что transport не должен управлять архитектурой.

Базовая структура backend:

```txt
src/
  app/
  modules/
  shared/
```

### `app`

Серверная композиция и bootstrap.

Здесь должно быть:

* создание RPC app
* регистрация модулей
* env wiring
* запуск сервера

### `modules`

Основная backend-логика разбивается по бизнес-модулям.

Например:

```txt
modules/
  hello/
```

Позже здесь могут появиться:

* tasks
* projects
* inbox
* auth
* reviews

### `shared`

Общая backend-инфраструктура.

Например:

* error primitives
* time helpers
* id helpers
* технические адаптеры

Это не место для бизнес-фич.

---

## Как устроен backend-модуль

Внутри модуля сейчас задана такая структура:

```txt
module/
  contract/
  domain/
  application/
  transport/
```

### `contract`

Описание публичной формы данных модуля на границе.

Часто это просто реэкспорт из `packages/contracts`.

### `domain`

Чистая бизнес-логика.

Тут не должно быть:

* Hono context
* tRPC context
* HTTP response objects
* прямого I/O

### `application`

Use cases и orchestration.

Это слой, который:

* вызывает domain-логику
* координирует сценарий
* со временем сможет работать с репозиториями
* проводит явные permission checks

### `transport`

Самый внешний слой backend-модуля.

Тут живут:

* Hono handlers
* tRPC procedures
* адаптация входа и выхода

Транспорт должен быть тонким и не содержать бизнес-решений.

---

## Зачем нужен `Hello World`

Текущий `Hello World` сделан не ради самой строки `"Hello world"`, а как минимальный сквозной пример архитектуры.

Он показывает путь данных через монорепу:

```txt
packages/contracts
  ↓
apps/api
  ↓
packages/frontend-app
  ↓
apps/web | apps/mobile | apps/desktop
```

На практике это значит:

1. в `packages/contracts` лежат общие типы запроса и ответа
2. backend в `apps/api` реализует use case и RPC handler
3. frontend в `packages/frontend-app` знает, как вызвать этот контракт и превратить ответ в presentation model
4. платформенные shell-приложения подключают общий frontend package

То есть даже `Hello World` уже показывает правильные границы ответственности.

---

## Как связаны правила `AGENTS.md`

Сейчас правила организованы иерархически.

Приоритет такой:

1. ближайший локальный `AGENTS.md`
2. родительский `AGENTS.md`
3. корневой `AGENTS.md`

На практике это значит:

* для работы в `packages/frontend-app` нужно читать [packages/frontend-app/AGENTS.md](file:///c:/server/pets/GTD-Planer/packages/frontend-app/AGENTS.md) и корневой [AGENTS.md](file:///c:/server/pets/GTD-Planer/AGENTS.md)
* для работы в `apps/api` нужно читать [apps/api/AGENTS.md](file:///c:/server/pets/GTD-Planer/apps/api/AGENTS.md) и корневой [AGENTS.md](file:///c:/server/pets/GTD-Planer/AGENTS.md)

Это сделано для того, чтобы frontend и backend могли иметь разные сильные правила, но при этом не терялся единый каркас репозитория.

---

## Главные архитектурные договоренности на текущий момент

Сейчас репозиторий строится вокруг нескольких базовых договоренностей:

* frontend и backend разделены явно
* frontend общий для web/mobile/desktop
* shell-приложения должны быть тонкими
* shared contracts живут отдельно от frontend и backend реализации
* backend transport не должен протекать в core-логику
* архитектура должна читаться по дереву папок

Если кратко, то идея такая:

* `apps` запускают
* `packages` переиспользуются
* `contracts` описывают границу
* `frontend-app` содержит продукт
* `api` содержит серверное выполнение бизнес-сценариев

---

## Что здесь еще не закончено

Архитектурный каркас уже заложен, но проект пока находится на стадии skeleton.

Еще предстоит выбрать и закрепить:

* финальный RPC transport: `Hono RPC` или `tRPC`
* реальный runtime/tooling для web
* Capacitor setup
* Tauri setup
* persistence strategy для backend
* auth model

Сейчас важнее не полнота реализации, а то, что уже правильно зафиксированы границы ответственности.

---

## Куда смотреть дальше

Если нужно быстро понять проект, логичный порядок чтения такой:

1. [AGENTS.md](file:///c:/server/pets/GTD-Planer/AGENTS.md)
2. [docs/architecture/monorepo-layout.md](file:///c:/server/pets/GTD-Planer/docs/architecture/monorepo-layout.md)
3. [docs/architecture/hello-world-flow.md](file:///c:/server/pets/GTD-Planer/docs/architecture/hello-world-flow.md)
4. [packages/frontend-app/AGENTS.md](file:///c:/server/pets/GTD-Planer/packages/frontend-app/AGENTS.md)
5. [apps/api/AGENTS.md](file:///c:/server/pets/GTD-Planer/apps/api/AGENTS.md)

А этот файл нужен как человеческая карта местности: чтобы было проще понять, что именно уже построено и почему оно разложено именно так.
