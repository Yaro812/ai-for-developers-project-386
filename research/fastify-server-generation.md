# Генерация серверных типов и маршрутов Fastify из контракта

Исследование к тикету #7, 2026-11-18. Вопрос: можно ли из TypeSpec или из OpenAPI, который он генерирует, получить серверные типы TypeScript, схемы проверки запросов и заготовки маршрутов Fastify, и каким инструментом; если генератора нет, как проверять написанный вручную сервер на соответствие контракту.

## Ответ

Готового генератора серверного кода Fastify из TypeSpec я не нашёл. Из OpenAPI задачу закрывает связка двух поддерживаемых инструментов, и пробный запуск на версиях проекта прошёл:

1. `@hey-api/openapi-ts` 0.99 с плагинами `@hey-api/typescript` и `fastify` генерирует типы моделей и тип `RouteHandlers`: для каждой операции тело, параметры пути и запроса, заголовки и ответы по кодам статуса. Это тот же генератор, который уже выбран для фронтендового SDK.
2. `fastify-openapi-glue` 4.12 при старте сервера читает тот же OpenAPI-файл и регистрирует в Fastify маршруты со схемами запросов и ответов; обработчики берёт из объекта, типизированного `RouteHandlers`.

Заготовки маршрутов в виде файлов эта связка не создаёт: маршруты строятся из спецификации во время запуска, а пропущенный обработчик ловит проверка типов. Соответствие ответов контракту проверяют тесты через `app.inject` с плагином `@fastify/response-validation`.

## Ограничения проекта

Проверено по репозиторию:

- Бекенд: Fastify `^5.12.8` (`backend/package.json`), Node.js 26.13.1 (`mise.toml`).
- Node запускает TypeScript без сборки: `tsconfig.json` бекенда включает `allowImportingTsExtensions`, `erasableSyntaxOnly`, `verbatimModuleSyntax`, `noEmit`; относительные импорты пишутся с расширением `.ts`.
- В рабочих пространствах TypeScript 7.0.2; `@hey-api/openapi-ts` 0.99.0 объявляет peer `typescript >=5.5.3 || >=6.0.0` (npm), поэтому пакет контракта получает свой `typescript@6`.
- Тесты бекенда: Vitest, `buildApp` из `backend/src/app.ts`.
- README требует: «Серверные типы и маршруты генерируются, если фреймворк это поддерживает; иначе бэкенд реализуется по контракту и проверяется тестами».

## Варианты

Версии и даты релизов взяты из npm-реестра 2026-11-18.

| Инструмент                                                          | Версия, последний релиз     | Что даёт                                                                                         | Fastify 5, Node 26 без сборки                                                                       | Вывод                                              |
| ------------------------------------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `@typespec/http-server-js`                                          | 0.58.0-alpha.30, 2026-11-11 | Типы моделей, интерфейсы сервисов, роутер с разбором и проверкой запросов                        | Роутер для `node:http` и Express, не Fastify; вывод не запускается без сборки (пробный запуск ниже) | Не подходит                                        |
| `@typespec/json-schema`                                             | 1.18.0, 2026-11-11          | JSON Schema моделей                                                                              | Маршрутов и типов не даёт                                                                           | Не нужен: те же схемы уже есть в OpenAPI           |
| `typespec-zod`                                                      | 0.0.0-68, 2026-01-26        | Схемы Zod из TypeSpec                                                                            | Не проверял                                                                                         | Пререлиз, не рассматриваю                          |
| `@hey-api/openapi-ts`, плагин `fastify`                             | 0.99.0, 2026-06-22          | Тип `RouteHandlers` с типами запросов и ответов                                                  | Работает (пробный запуск)                                                                           | Берём для типов                                    |
| `fastify-openapi-glue`                                              | 4.12.0, 2026-10-18          | Маршруты и схемы проверки из OpenAPI при старте; CLI-заготовка проекта на JS                     | Работает (пробный запуск)                                                                           | Берём для маршрутов и проверки                     |
| `@platformatic/fastify-openapi-glue`                                | 5.2.0, 2026-08-06           | Форк `fastify-openapi-glue`                                                                      | Не проверял                                                                                         | Три релиза за два года; оригинал живее             |
| `fastify-openapi-connector` и `fastify-openapi-connector-generator` | 4.1.0 и 2.0.0, 2026-01-30   | Маршруты и проверка из OpenAPI 3.1, типы и файлы-заготовки обработчиков на TS                    | Работает, но генератор тянет TypeScript 5 (пробный запуск)                                          | Запасной вариант                                   |
| `openapi-backend`                                                   | 5.24.0, 2026-11-09          | Маршрутизация и проверка Ajv вне фреймворка                                                      | В Fastify подключается одним маршрутом `/*`                                                         | Обходит маршрутизацию и схемы Fastify; не проверял |
| `@autotelic/fastify-openapi-autoload`                               | 0.3.0, 2025-07-14           | Обёртка над `fastify-openapi-glue` и `@fastify/autoload` 5                                       | Не проверял                                                                                         | Зависит от `fastify-plugin` 4; не рассматриваю     |
| OpenAPI Generator                                                   | —                           | Серверные генераторы для Node: `nodejs-express-server` (beta), `typescript-nestjs-server` (beta) | Генератора Fastify в списке нет                                                                     | Не подходит                                        |
| Orval                                                               | 8.48.0, 2026-11-14          | Серверный вывод только для Hono (`@orval/hono`)                                                  | Вывода для Fastify не нашёл                                                                         | Не подходит                                        |
| Kubb                                                                | `@kubb/core` 5.21.1         | —                                                                                                | Плагина Fastify не нашёл: `@kubb/plugin-fastify` в npm нет, поиск по коду репозитория пуст          | Не подходит                                        |

Поиск в npm по «typespec fastify» и «typespec emitter server» эмиттеров для Fastify не нашёл; официальные серверные эмиттеры TypeSpec в npm — `@typespec/http-server-js` и `@typespec/http-server-csharp`.

### `@typespec/http-server-js`

README пакета предупреждает, что пакет «highly experimental». Эмиттер генерирует роутер с методом `dispatch` для события `request` сервера `node:http` и, с опцией `express: true`, middleware для Express. Интеграции с Fastify в README и в коде репозитория `microsoft/typespec` я не нашёл.

Пробный запуск на тестовом контракте показал три проблемы:

- Генерируются файлы `.ts`, но относительные импорты в них заканчиваются на `.js` (`import * as serverRaw from "./operations/server-raw.js"`). Node 26 без сборки падает с `ERR_MODULE_NOT_FOUND`: стирание типов не подменяет расширения.
- Даты по умолчанию имеют тип `Temporal.Instant` из `temporal-polyfill` (опция `datetime`).
- Сгенерированный код не проходит `tsc` для параметра запроса `from`: `'from' does not exist in type 'ListOptions'. Did you mean to write '_from'?`.

### `@hey-api/openapi-ts`, плагин `fastify`

Документация плагина помечает его статусом beta и обещает поддержку Fastify v5. Плагин требует `@hey-api/typescript` и генерирует один тип:

```ts
export type RouteHandlers = {
  eventTypesRead: RouteHandler<{
    Params: EventTypesReadData["path"];
    Reply: EventTypesReadErrors & EventTypesReadResponses;
  }>;
  // ... по одному полю на операцию
};
```

По исходному коду плагина поля `Body`, `Headers`, `Params`, `Querystring` появляются, если они есть у операции, а `Reply` объединяет ответы и ошибки по кодам статуса. Маршрутов и схем проверки плагин не генерирует. Официальный пример `examples/openapi-ts-fastify` в репозитории hey-api подключает обработчики через `fastify-openapi-glue`.

Опция `output.module.extension: ".ts"` даёт импорты вида `./types.gen.ts`, которые Node запускает без сборки. Перечислений TypeScript в выводе нет: union-типы строк.

### `fastify-openapi-glue`

Плагин регистрирует маршруты, схемы запросов и схемы ответов по OpenAPI v2 и v3; файл спецификации передаётся путём к JSON или YAML или объектом. Обработчик ищется в `serviceHandlers` по `operationId` без преобразования (`index.js`: `if (operationId in serviceHandlers)`); опция `operationResolver` позволяет искать обработчик своей функцией. Неизвестный обработчик превращается в маршрут, который отвечает 500 «Operation … not implemented».

Состояние: релизы в 2026 году выходили почти каждый месяц, разработка идёт на `fastify ^5.12.7`, в репозитории 251 звезда. Для OpenAPI 3.1 с ключевыми словами JSON Schema 2020-12 документация советует подключить `Ajv2020`; схемы, которые даёт TypeSpec, работают и со стандартным Ajv (пробный запуск).

CLI `openapi-glue` генерирует заготовку проекта только на JavaScript (`--type=javascript` или `standaloneJS`) и перезаписывает файлы, поэтому для повторной генерации по изменённому контракту не годится.

### `fastify-openapi-connector`

Плагин похож на `fastify-openapi-glue`, поддерживает только OpenAPI 3.1 и имеет настройку `validateResponses`. Его генератор создаёт файл-заготовку на TypeScript для каждой операции и карту обработчиков; импорты пишутся с расширением из опции `--import-extension`. Типы берутся из вывода `openapi-typescript`.

Против него: один автор, 3 звезды, последний релиз 2026-01-30; `openapi-typescript` 7.13.0 объявляет peer `typescript ^5.x`, и npm отказывается ставить его рядом с TypeScript 6 (`ERESOLVE`), то есть в проекте появится третья версия TypeScript; генератор тянет устаревший `glob@10.3.10`; README описывает экспорт по умолчанию, а пакет экспортирует только `openApiConnectorPlugin`.

## Пробный запуск

Окружение: Node 26.13.1, Fastify 5.12.8, TypeSpec 1.18.0, `@hey-api/openapi-ts` 0.99.0 с TypeScript 6.0.3, `fastify-openapi-glue` 4.12.0, `@fastify/response-validation` 3.0.5, `tsc` 7.0.2. Контракт: модели `EventType` и `Booking` с `@minValue`, `@format("email")`, `utcDateTime`; операции `GET`/`POST /event-types`, `GET /event-types/{id}` с ответом 404, `GET /bookings?from=`, `POST /bookings` с ответами 201 и 409. TypeSpec сгенерировал OpenAPI 3.0.0 и 3.1.0.

Проверка типов (`tsc` 7, `strict`, `erasableSyntaxOnly`, `allowImportingTsExtensions`) нашла каждую намеренную ошибку в обработчиках, типизированных `RouteHandlers`:

- строка вместо числа в теле ответа;
- обращение к полю тела запроса, которого нет в контракте;
- код статуса, которого нет в контракте (`reply.code(200)` у операции с ответом 201);
- тело 404 не того типа;
- параметр пути с чужим именем;
- отсутствующий обработчик операции.

Запросы через `app.inject` к серверу на `fastify-openapi-glue` дали одинаковый результат для OpenAPI 3.0 и 3.1:

| Случай                                      | Без `@fastify/response-validation` | С `@fastify/response-validation` |
| ------------------------------------------- | ---------------------------------- | -------------------------------- |
| `durationMinutes: 1` при `@minValue(5)`     | 400                                | 400                              |
| Неверный email, неверная дата `date-time`   | 400                                | 400                              |
| В ответе нет обязательного поля             | 500 (сериализатор)                 | 500                              |
| Строка вместо целого в ответе               | 500 (сериализатор)                 | 500                              |
| Значение вне перечисления в ответе          | проходит                           | 500                              |
| Лишнее поле в ответе                        | вырезается                         | вырезается                       |
| Код статуса, которого нет в контракте (418) | проходит                           | проходит                         |

Что выяснилось по ходу:

- Тип `Reply` в виде карты «код статуса → тело» Fastify проверяет только в `reply.code(n).send(body)`. Обработчик, который возвращает тело через `return`, не проходит проверку типов, поэтому обработчики пишутся через `reply.code(...).send(...)`.
- TypeSpec генерирует `operationId` вида `EventTypes_read`, а hey-api называет поле `eventTypesRead`. `fastify-openapi-glue` ищет обработчик по исходному `operationId`, поэтому без согласования имён ни один обработчик не находится.
- `@fastify/response-validation` создаёт свой экземпляр Ajv без форматов и при старте падает на `unknown format "date-time"`; помогает опция `ajv: { plugins: [ajvFormats.default] }`. Импорт по умолчанию из `ajv-formats` при `module: nodenext` типизируется как пространство имён, поэтому нужен `.default`. Плагин регистрировался до `fastify-openapi-glue`.
- Ошибка проверки запроса возвращается в формате Fastify: `{ statusCode, code: "FST_ERR_VALIDATION", error, message }`.

## Рекомендация

1. Генерировать в пакете контракта, рядом с SDK для фронтенда, серверные типы: `@hey-api/openapi-ts` с плагинами `@hey-api/typescript` и `fastify` и `output.module.extension: ".ts"`.
2. Регистрировать маршруты в `buildApp` плагином `fastify-openapi-glue` по тому же OpenAPI-файлу, а обработчики держать в объекте типа `RouteHandlers`.
3. Согласовать имена операций одним из способов:
   1. задать в TypeSpec `operationId` в camelCase, совпадающий с именами hey-api, или
   2. передать в `fastify-openapi-glue` `operationResolver`, который переводит `EventTypes_read` в `eventTypesRead` и бросает исключение, если обработчика нет, — тогда несогласованное имя роняет `buildApp` при старте и в любом тесте.
4. Писать обработчики через `reply.code(n).send(body)`.

Набросок по варианту 3.2. В пробном запуске он прошёл `tsc` 7 и запустился в Node 26 без сборки, а без обработчика `bookingsCreate` `buildApp` упал при старте с «No handler for operation Bookings_create»:

```ts
import Fastify, { type RouteHandlerMethod } from "fastify";
import openapiGlue from "fastify-openapi-glue";
import type { RouteHandlers } from "<сгенерированные типы>/fastify.gen.ts";

const handlers: RouteHandlers = {
  async eventTypesRead(request, reply) {
    return reply.code(200).send({ id: request.params.id, title: "Intro", durationMinutes: 30 });
  },
  // ... остальные операции; пропуск — ошибка типов
};

// TypeSpec: `EventTypes_read`, hey-api: `eventTypesRead`.
const handlerName = (operationId: string) =>
  operationId
    .replace(/_(\w)/g, (_, c: string) => c.toUpperCase())
    .replace(/^\w/, (c) => c.toLowerCase());

function resolveHandler(operationId: string) {
  const handler = (handlers as Record<string, RouteHandlerMethod | undefined>)[
    handlerName(operationId)
  ];
  if (!handler) throw new Error(`No handler for operation ${operationId}`);
  return handler;
}

export async function buildApp() {
  const app = Fastify();
  await app.register(openapiGlue, {
    specification: "<путь к openapi.yaml>",
    operationResolver: resolveHandler,
  });
  return app;
}
```

## Проверка соответствия контракту

Генерация закрывает не всё, поэтому проверка складывается из четырёх слоёв:

1. **Типы.** `tsc` по `RouteHandlers` ловит пропущенный обработчик, неверные параметры, тело запроса, тело ответа и код статуса, которого нет в контракте (проверено).
2. **Запросы.** Схемы из OpenAPI проверяют тело, путь и строку запроса до обработчика и отвечают 400 (проверено).
3. **Ответы.** В тестах `buildApp` регистрирует `@fastify/response-validation` до `fastify-openapi-glue`; тогда ответ, нарушающий схему, становится 500, и тест через `app.inject` падает (проверено). Документация плагина советует не включать его в рабочем режиме из-за потери производительности.
4. **Коды статуса.** Ни сериализатор, ни `@fastify/response-validation` не замечают код статуса, которого нет в контракте; его ловят типы и тесты, которые проверяют статус каждого ответа.

## Оговорки

Это выводы, а не результаты пробного запуска:

- Сервер читает OpenAPI-файл при старте, поэтому файл должен попасть в Docker-образ (тикет #6).
- Формат ошибки 400 задаёт Fastify. Если контракт (тикет #10) описывает свой формат ошибок, понадобится обработчик ошибок Fastify, переводящий ошибки проверки в формат контракта, и тест на 400.
- Статус плагина `fastify` в hey-api — beta: его вывод может меняться между версиями 0.x. Пакет контракта фиксирует версию hey-api, так что изменение придёт только при обновлении.
- Расхождение между TypeSpec, OpenAPI и сгенерированными типами ловится, только если общая проверка заново генерирует OpenAPI и типы и падает на разнице с репозиторием или генерирует их перед `typecheck` (тикет #11).

Не проверял: `typespec-zod`, `@platformatic/fastify-openapi-glue`, `openapi-backend`, `@autotelic/fastify-openapi-autoload`, а также SDK hey-api с проверкой ответов через Zod как альтернативу `@fastify/response-validation` в тестах.

## Источники

- `@typespec/http-server-js`, README: https://github.com/microsoft/typespec/blob/main/packages/http-server-js/README.md
- Плагин `fastify` в hey-api, документация: https://github.com/hey-api/hey-api/blob/main/web/src/content/docs/docs/openapi/typescript/plugins/fastify.mdx
- Плагин `fastify` в hey-api, исходный код: https://github.com/hey-api/hey-api/blob/main/packages/openapi-ts/src/plugins/fastify/plugin.ts
- Пример hey-api с `fastify-openapi-glue`: https://github.com/hey-api/hey-api/tree/main/examples/openapi-ts-fastify
- `fastify-openapi-glue`, README, типы, релизы: https://github.com/seriousme/fastify-openapi-glue
- `fastify-openapi-glue`, OpenAPI 3.1 и JSON Schema 2020-12: https://github.com/seriousme/fastify-openapi-glue/blob/master/docs/schema2020.md
- `@fastify/response-validation`, README: https://github.com/fastify/fastify-response-validation
- `fastify-openapi-connector` и генератор, README: https://github.com/martinek-stepan/fastify-openapi-connector
- `openapi-backend`, README (раздел Fastify): https://github.com/openapistack/openapi-backend
- Список генераторов OpenAPI Generator: https://github.com/OpenAPITools/openapi-generator/blob/master/docs/generators.md
- Метаданные npm (версии, даты, зависимости, peer-зависимости): https://www.npmjs.com/ — `@typespec/http-server-js`, `@typespec/json-schema`, `typespec-zod`, `@hey-api/openapi-ts`, `fastify-openapi-glue`, `@platformatic/fastify-openapi-glue`, `fastify-openapi-connector`, `fastify-openapi-connector-generator`, `openapi-typescript`, `openapi-backend`, `orval`, `@kubb/core`, `@autotelic/fastify-openapi-autoload`, `@fastify/response-validation`
