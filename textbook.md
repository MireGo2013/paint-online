# Совместный графический редактор: WebSocket, Canvas, React и Node.js

Учебник о том, как устроено веб-приложение для совместного рисования в реальном времени: несколько человек открывают одну ссылку и рисуют на общем холсте. Клиент — React 19, TypeScript, MobX и Canvas API, сервер — Node.js, Express 5 и WebSocket.

---

## Как читать этот учебник

**Для кого.** Для разработчика, который знает JavaScript и основы TypeScript, писал компоненты на React и запускал Node.js. Учебник объясняет не только, что написать, но и почему это работает, где ломается и как это проверить.

**Как построены главы.** Главы идут в том порядке, в котором приложение собирается: сначала клиент без сети, потом сервер, потом всё связывается. Многие темы разобраны циклом «наивный вариант → в чём его проблема → рабочий вариант». Наивный вариант — это не придуманная ошибка, а код, который часто пишут, впервые решая задачу.

**Врезки.**

- **На заметку** — полезное углубление, его можно пропустить без потери понимания.
- **Внимание** — частая ошибка или неочевидное поведение и симптом, по которому её узнать.
- **Важно** — правило, нарушение которого ломает код.
- **Под капотом** — устройство механизма: что делает браузер, Node.js или библиотека.

**Что значит «проверено».** Пометка *проверено* означает, что утверждение подтверждено запуском кода или сверено с исходным кодом установленных библиотек (`node_modules`). Версии на момент проверки перечислены в главе 0 и в части II.

**Код.** Код в главах совпадает с кодом проекта (`client/src`, `server/src`). Где глава показывает промежуточную версию, которая позже меняется, это сказано явно. Сервер в главах 9–14 показан на JavaScript, чтобы не отвлекаться от механизмов на типы. В проекте он написан на TypeScript с той же логикой, и итоговая версия с разбором типизации — в главе 17.

---

## Содержание

**Часть I. Учебник**

0. [Что строим и на чём](#глава-0-что-строим-и-на-чём)
1. [Как сервер сообщает о событиях: от опроса к WebSocket](#глава-1-как-сервер-сообщает-о-событиях-от-опроса-к-websocket)
2. [Клиентский проект: Vite, React 19 и TypeScript](#глава-2-клиентский-проект-vite-react-19-и-typescript)
3. [Вёрстка и CSS-модули](#глава-3-вёрстка-и-css-модули)
4. [Состояние приложения: MobX](#глава-4-состояние-приложения-mobx)
5. [Canvas API: что нужно знать до инструментов](#глава-5-canvas-api-что-нужно-знать-до-инструментов)
6. [Инструменты рисования](#глава-6-инструменты-рисования)
7. [Цвет и толщина линии](#глава-7-цвет-и-толщина-линии)
8. [История действий и сохранение картинки](#глава-8-история-действий-и-сохранение-картинки)
9. [Серверный проект: Express 5, ESM и CORS](#глава-9-серверный-проект-express-5-esm-и-cors)
10. [WebSocket на сервере: рукопожатие, кадры, протокол сообщений](#глава-10-websocket-на-сервере-рукопожатие-кадры-протокол-сообщений)
11. [Сессии: уникальные ссылки и маршрутизация](#глава-11-сессии-уникальные-ссылки-и-маршрутизация)
12. [Вход в сессию: модальное окно и подключение](#глава-12-вход-в-сессию-модальное-окно-и-подключение)
13. [Совместное рисование](#глава-13-совместное-рисование)
14. [Хранение рисунка: снимок холста по HTTP](#глава-14-хранение-рисунка-снимок-холста-по-http)
15. [Проверка и диагностика](#глава-15-проверка-и-диагностика)
16. [Итоговая структура, ограничения и что дальше](#глава-16-итоговая-структура-ограничения-и-что-дальше)
17. [Сервер на TypeScript](#глава-17-сервер-на-typescript)

**Часть II. Что проверено и источники**

- [Что проверено](#что-проверено)
- [Источники](#источники)

---

# Часть I. Учебник

## Глава 0. Что строим и на чём

**Цель главы:** увидеть приложение целиком до того, как разбирать части.

### 0.1. Приложение

Пользователь открывает адрес приложения и попадает на ссылку вида `/3b241101-e2bb-4255-8caf-4136c566a962`: это его новая сессия. Он вводит имя и рисует. Все, у кого открыта та же ссылка, видят рисунок в реальном времени. Кто откроет ссылку позже, увидит уже нарисованное.

Инструменты: кисть, прямоугольник, круг, линия, ластик. Есть выбор цвета и толщины линии, отмена и повтор действия (undo/redo) и сохранение рисунка в PNG.

### 0.2. Архитектура

```
Браузер A ──ws──┐                ┌──ws── Браузер B
                ├── Сервер Node ─┤
Браузер A ─http─┘   (сессия id)  └─http─ Браузер B

ws:   { method: 'draw', id, figure }   — каждое действие рисования
http: POST/GET /image?id=...           — снимок холста целиком
```

Каналов связи два, и у каждого своя роль:

- **WebSocket** — постоянное соединение для событий: «вошёл участник», «нарисован отрезок», «нарисован прямоугольник». Сервер ничего не рисует, а только пересылает события участникам той же сессии.
- **HTTP** — запрос и ответ для снимка холста. После каждого действия клиент отправляет PNG на сервер, а при открытии ссылки загружает его. Так вошедший позже видит то, что нарисовали до него.

### 0.3. Стек и версии

| Часть | Технология | Версия |
|---|---|---|
| Сборка клиента | Vite | 8.3.4 |
| UI | React | 19.3.1 |
| Язык клиента | TypeScript | 6.0.3 |
| Состояние | MobX, mobx-react-lite | 7.0.6, 5.1.0 |
| Маршруты | react-router | 8.4.0 |
| Стили | SCSS-модули, sass-embedded | 1.105.2 |
| Среда сервера | Node.js | 24.18 |
| HTTP-сервер | Express | 5.3.0 |
| WebSocket | express-ws (внутри ws) | 5.0.2 (ws 7.5.13) |
| CORS | cors | 2.8.6 |
| Язык сервера | TypeScript (запуск без сборки) | 6.0.3 |

Клиент и сервер написаны на TypeScript в строгом режиме. Сервер использует модули ESM и запускается прямо из `.ts`-файлов: Node 24 сам удаляет типы (глава 17).

### 0.4. Карта проекта

```
client/src/
├── main.tsx                 точка входа React
├── App.tsx                  карта маршрутов
├── config.ts                адреса сервера (HTTP и WebSocket)
├── pages/PaintPage/         экран редактора
├── components/              Canvas, Toolbar, SettingBar, UsernameModal (+ *.module.scss)
├── hooks/useSessionSocket.ts  подключение к сессии
├── store/                   MobX: canvasState, toolState
├── tools/                   Tool, Brush, Rect, Circle, Line, Eraser, drawFigure
├── ws/                      типы сообщений, отправка и разбор
├── api/image.ts             загрузка и сохранение снимка
├── utils/generateId.ts      id новой сессии
├── styles/                  variables.scss, global.scss
└── assets/img/              иконки инструментов

server/src/
├── index.ts                 точка входа: папка files, запуск
├── app.ts                   сборка приложения
├── config.ts                порт, путь к папке files
├── routes/image.ts          HTTP: снимок холста
└── ws/
    ├── index.ts             WebSocket-маршрут и switch по method
    ├── messages.ts          типы сообщений и проверка их формы
    ├── broadcast.ts         рассылка участникам сессии
    └── handlers/            connection.ts, draw.ts
```

Запуск — два терминала:

```bash
cd server && npm install && npm run dev   # server started on PORT 5000
cd client && npm install && npm run dev   # http://localhost:5173
```

---

## Глава 1. Как сервер сообщает о событиях: от опроса к WebSocket

**Цель главы:** понять, почему для совместного рисования нужен именно WebSocket.

HTTP работает по схеме «запрос — ответ»: говорит всегда клиент, сервер только отвечает. Чтобы браузер B узнал о штрихе браузера A, сервер должен сам отправить ему данные, а в модели «запрос — ответ» такого шага нет.

### 1.1. Способы доставки событий с сервера

| Способ | Как работает | Цена |
|---|---|---|
| Опрос (polling) | клиент спрашивает «есть новое?» раз в N мс | задержка до N мс, пустые запросы |
| Долгий опрос (long polling) | сервер держит запрос открытым, пока не появятся данные | новый запрос после каждого ответа |
| Server-Sent Events (SSE) | один долгий HTTP-ответ, в который сервер пишет события | только сервер → клиент |
| WebSocket | одно постоянное соединение, обе стороны пишут когда угодно | сервер хранит состояние каждого соединения |

Рисование — это десятки событий в секунду в обе стороны. Подходит WebSocket: соединение открывается один раз, дальше каждое сообщение несёт несколько байт заголовка кадра вместо сотен байт HTTP-заголовков.

### 1.2. WebSocket в браузере

Код ниже можно выполнить в консоли DevTools на любой странице:

```js
const ws = new WebSocket('wss://echo.websocket.org')
ws.onopen = () => ws.send('привет')
ws.onmessage = (e) => console.log(e.data)
// Request served by ...   ← служебное приветствие этого сервера
// привет
```

`echo.websocket.org` — публичный эхо-сервер: всё, что получил, он отправляет обратно (*проверено*). Модель работы та же, что в приложении:

- открыть соединение;
- отправлять сообщения в `onopen` и позже;
- принимать их в `onmessage`.

Устройство соединения (рукопожатие, кадры) разобрано в главе 10.

---

## Глава 2. Клиентский проект: Vite, React 19 и TypeScript

**Цель главы:** создать клиент и знать, какие настройки шаблона влияют на дальнейший код.

### 2.1. Создание проекта

```bash
npm create vite@latest client -- --template react-ts
cd client
npm install mobx mobx-react-lite react-router
npm install -D sass-embedded typescript@~6.0.3
npm run dev   # http://localhost:5173
```

- **`react-ts`** — шаблон React + TypeScript. В нём уже настроены `@vitejs/plugin-react` и линтер oxlint. Create React App для новых проектов больше не используется: в феврале 2025 года его объявили устаревшим.
- **`sass-embedded`** — Dart Sass, запущенный как отдельный нативный процесс. Vite рекомендует его как более быстрый вариант, обычный пакет `sass` тоже работает. `node-sass` (обёртка над LibSass на C++) больше не поддерживается. Vite сам находит установленный Sass: импорт `.scss` работает без настройки `vite.config.ts`.
- **`typescript@~6.0.3`** — почему не 7, которую ставит шаблон, разобрано в разделе 2.3.

После создания демо-код шаблона удаляется: `App.css`, `index.css`, логотипы, `public/icons.svg`.

### 2.2. Точка входа

В React 19 приложение монтируется только через `createRoot`. Функция `ReactDOM.render` удалена.

```tsx
// src/main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.scss'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

`!` после `getElementById` — утверждение для TypeScript «здесь не `null`» (non-null assertion). `getElementById` возвращает `HTMLElement | null`, а `createRoot` не принимает `null`. Элемент `#root` гарантированно есть в `index.html`, поэтому утверждение безопасно.

> **Внимание** — шаблон оборачивает `<App />` в `<StrictMode>`. В режиме разработки React 18+ при монтировании выполняет каждый `useEffect` дважды: смонтировать → размонтировать → смонтировать. Эффект без функции очистки, который открывает WebSocket, откроет **два** соединения. Поэтому все эффекты в проекте пишутся с очисткой (глава 12). В production-сборке эффекты выполняются один раз.

### 2.3. TypeScript: строгий режим и версия

В `tsconfig.app.json` шаблона нет `"strict": true`, но строгий режим включён: в TypeScript 6 и 7 это значение по умолчанию (*проверено*). Неявный `any` даёт ошибку TS7006, `null` в переменной типа `number` — TS2322.

Опции шаблона, которые встретятся в коде:

| Опция | Что даёт |
|---|---|
| `allowImportingTsExtensions` | импорт с расширением: `import App from './App.tsx'` |
| `verbatimModuleSyntax` | импорт, используемый только как тип, обязан быть помечен `type`: `import type Tool from './Tool.ts'` |
| `erasableSyntaxOnly` | запрещает синтаксис TypeScript, который нельзя просто стереть: `enum`, `namespace`, свойства-параметры конструктора |
| `noUnusedLocals` | неиспользуемая локальная переменная — ошибка |
| `types: ["vite/client"]` | типы для импорта картинок и CSS-модулей |

Проверку типов выполняет не Vite, а `tsc -b` в скрипте `npm run build`. При разработке Vite только вырезает типы и о типовых ошибках не сообщает.

> **Внимание** — TypeScript 7 — компилятор, переписанный на Go. Пакет `typescript@7` содержит только `tsc`: в `node_modules/typescript/lib` нет `tsserver.js` и `typescript.js` (*проверено*). А IDE, которые берут языковой сервис из пакета проекта (WebStorm и другие JetBrains IDE), работают именно через `tsserver`. Симптом: Ctrl+клик по компоненту ничего не делает, переход к объявлению и поиск использований не работают, хотя `tsc -b` проходит. Решение — TypeScript 6: `npm install -D typescript@~6.0.3`. Все опции шаблона с ним работают так же. В WebStorm затем: Settings → Languages & Frameworks → TypeScript → путь к `client/node_modules/typescript`, и перезапуск сервиса (виджет TypeScript в строке состояния → Restart).

---

## Глава 3. Вёрстка и CSS-модули

**Цель главы:** собрать экран из трёх частей и понять, как CSS-модули меняют работу со стилями.

### 3.1. Экран

Экран редактора состоит из трёх частей:

- **`Toolbar`** — полоса 40 px сверху: инструменты, цвет, undo, redo, сохранение;
- **`SettingBar`** — вторая полоса 40 px: толщина и цвет обводки;
- **`Canvas`** — холст 600 × 400 по центру экрана.

Обе полосы позиционированы абсолютно и лежат поверх области холста.

Общие переменные и глобальные правила — в `styles/`:

```scss
// styles/variables.scss
$background-color: #f6f6f6;
$toolbar-height: 40px;
```

```scss
// styles/global.scss
@use "./variables" as *;

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  background-color: $background-color;
}
```

`@use` подключает файл как модуль с пространством имён, а `as *` убирает префикс, поэтому можно писать `$toolbar-height`, а не `variables.$toolbar-height`. Старый `@import` в Dart Sass объявлен устаревшим: он сваливает все переменные всех файлов в одну глобальную область.

### 3.2. CSS-модули

Обычный CSS глобален: класс `.toolbar` совпадёт с любым элементом с этим классом во всём приложении. CSS-модуль (CSS Modules) — файл `*.module.scss`, классы которого при сборке получают уникальные имена, а в коде импортируются как объект.

```tsx
// App.tsx
import styles from './App.module.scss'

console.log(styles.app) // app_pgifq_1 — имя класса после сборки

const App = () => <div className={styles.app}></div>
```

Vite узнаёт модуль по суффиксу `.module.` в имени файла (*проверено* в dev-режиме). Объект `styles` отображает имя класса из исходника (`app`) в сгенерированное (`app_pgifq_1`). Два компонента с классом `.btn` больше не конфликтуют, поэтому имена можно делать короткими.

| Глобальные классы | CSS-модули |
|---|---|
| `className="toolbar"` | `className={styles.toolbar}` |
| `className="toolbar__btn brush"` | ``className={`${styles.btn} ${styles.brush}`}`` |
| БЭМ-префикс `toolbar__` защищает от конфликтов имён | изоляцию даёт сборка, имя — просто `.btn` |
| `setting-bar` | `settingBar`: читается как `styles.settingBar`, а не `styles['setting-bar']` |

Правила, которые **должны** быть глобальными (сброс отступов, фон `body`), лежат в `global.scss` и подключаются обычным импортом в `main.tsx`. Внутри модуля глобальный селектор пишется через `:global(...)`.

> **Внимание** — в модуле локальными становятся только **классы**. Селектор тега `canvas { ... }` внутри модуля остаётся глобальным и задевает любой `<canvas>` на странице. Поэтому у холста свой класс `.canvas`.

> **Внимание** — `styles` в TypeScript имеет тип `CSSModuleClasses`, по сути `Record<string, string>` из `vite/client`. Опечатка `styles.tolbar` ошибки типов **не** даёт: вернётся `undefined`, и элемент молча останется без стилей. Если класс «не применяется», первым делом проверьте имя в объекте `styles`.

### 3.3. Холст

```tsx
// components/Canvas/Canvas.tsx — вёрстка (логика добавляется в главах 4, 8, 14)
const canvasRef = useRef<HTMLCanvasElement>(null)

return (
  <div className={styles.wrapper}>
    <canvas ref={canvasRef} className={styles.canvas} width={600} height={400} />
  </div>
)
```

```scss
// components/Canvas/Canvas.module.scss
.wrapper {
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
}

.canvas {
  border: 1px solid black;
  background-color: white;
}
```

- **`useRef<HTMLCanvasElement>(null)`.** Параметр типа говорит TypeScript, какой элемент окажется в `ref.current`. В React 19 `useRef` требует начальное значение, поэтому `null` указан явно.
- **Размер — атрибутами `width`/`height`**, а не через CSS. Почему это важно, разобрано в разделе 5.1.
- **Белый фон даёт CSS**, а сами пиксели холста прозрачные. Это понадобится в главах 6 (ластик) и 8 (сохранение в PNG).

### 3.4. Панель инструментов

```tsx
// components/Toolbar/Toolbar.tsx — разметка (обработчики — в главах 6–8)
<div className={styles.toolbar}>
  <button type="button" className={`${styles.btn} ${styles.brush}`} aria-label="Кисть" />
  <button type="button" className={`${styles.btn} ${styles.rect}`} aria-label="Прямоугольник" />
  <button type="button" className={`${styles.btn} ${styles.circle}`} aria-label="Круг" />
  <button type="button" className={`${styles.btn} ${styles.eraser}`} aria-label="Ластик" />
  <button type="button" className={`${styles.btn} ${styles.line}`} aria-label="Линия" />
  <input type="color" className={styles.color} aria-label="Цвет" />
  <button type="button" className={`${styles.btn} ${styles.undo}`} aria-label="Отменить" />
  <button type="button" className={`${styles.btn} ${styles.redo}`} aria-label="Повторить" />
  <button type="button" className={`${styles.btn} ${styles.save}`} aria-label="Сохранить" />
</div>
```

```scss
// components/Toolbar/Toolbar.module.scss (фрагмент)
@use "../../styles/variables" as *;

.toolbar {
  height: $toolbar-height;
  background-color: white;
  display: flex;
  align-items: center;
  position: absolute;
  width: 100%;
  box-shadow: 0 4px 5px gray;
  z-index: 999;
}

.btn {
  height: 25px;
  width: 25px;
  margin-left: 10px;
  border: none;
  outline: none;
  cursor: pointer;
  background-color: transparent;
  background-position: center;
  background-repeat: no-repeat;
  background-size: contain;
}

.brush {
  background-image: url("../../assets/img/brush.png");
}

.undo {
  margin-left: auto;
  background-image: url("../../assets/img/undo.png");
}
```

- **`margin-left: auto` у undo** забирает всё свободное место во flex-контейнере слева от себя. Поэтому undo, redo и save прижимаются к правому краю.
- **`position: absolute` и `z-index`.** Панель лежит поверх `Canvas`, который занимает весь экран. Без абсолютного позиционирования она сдвинула бы холст вниз на 40 px.
- **`type="button"`.** По умолчанию тип кнопки — `submit`, и внутри формы она бы её отправляла. Явный тип защищает от этого, если панель когда-нибудь окажется в `<form>`.
- **`aria-label`.** У кнопок-иконок нет текста, и экранный диктор прочитал бы их просто как «кнопка».
- **Путь в `url()`** считается от файла стилей, в котором написан.

Наивный вариант фона кнопки — сокращённое свойство в классе иконки:

```scss
.btn { background-size: cover; }
.toolbar .brush { background: url("brush.png") no-repeat center center; }
```

Проблема: сокращённое `background` сбрасывает **все** фоновые свойства, которые в нём не указаны, к начальным значениям. Более специфичное правило `.toolbar .brush` молча отменяет `background-size: cover`. Заодно оно сбрасывает `background-color` в прозрачный, хотя кажется, что этого никто не писал.

Рабочий вариант — разложить фон на отдельные свойства: `background-image` в классе иконки, остальное в `.btn`. Тогда ничто ничего не сбрасывает. Прозрачность фона нужно задать явно (`background-color: transparent`), иначе у `<button>` останется серый фон браузера.

> **Под капотом** — иконки меньше 4 КБ Vite не копирует отдельными файлами, а встраивает прямо в CSS как `data:image/png;base64,...`. За это отвечает настройка `build.assetsInlineLimit`, по умолчанию 4096 байт, и она экономит HTTP-запросы. Иконки проекта весят 200–430 байт, поэтому в сборке PNG-файлов нет совсем, а CSS весит 4,9 КБ (*проверено* `vite build`).

### 3.5. Панель настроек

```tsx
// components/SettingBar/SettingBar.tsx — разметка (обработчики — в главе 7)
<div className={styles.settingBar}>
  <label htmlFor="line-width">Толщина линии</label>
  <input id="line-width" className={styles.lineWidth} type="number"
         defaultValue={1} min={1} max={50} />
  <label htmlFor="stroke-color">Цвет обводки</label>
  <input id="stroke-color" type="color" />
</div>
```

```scss
// components/SettingBar/SettingBar.module.scss
@use "../../styles/variables" as *;

.settingBar {
  height: $toolbar-height;
  background-color: white;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 10px;
  position: absolute;
  top: $toolbar-height;
  width: 100%;
  box-shadow: 0 4px 5px gray;
}

.lineWidth {
  width: 50px;
}
```

- **`top: $toolbar-height`** ставит полосу ровно под панель инструментов. Высота берётся из общей переменной, поэтому при её изменении вторая полоса сдвинется сама.
- **`gap` и `padding`** дают все отступы. Инлайн-стили вида `style={{ margin: '0 10px' }}` в разметке не нужны.
- **`label htmlFor` + `id`** связывают подпись с полем: клик по тексту ставит фокус в поле, а экранный диктор читает подпись вместе с ним. В JSX атрибут называется `htmlFor`, потому что `for` — зарезервированное слово JavaScript.
- **`defaultValue`, а не `value`.** Поле **неуправляемое** (uncontrolled): React задаёт только начальное значение, дальше его хранит DOM. Значение читается в `onChange` и сразу уходит в стор, хранить его в состоянии компонента не нужно. С `value` без `onChange` React сделал бы поле доступным только для чтения.

---

## Глава 4. Состояние приложения: MobX

**Цель главы:** понять, как MobX связывает данные с компонентами, и завести два стора приложения.

### 4.1. Как работает MobX

MobX делает объект наблюдаемым (observable). Компонент, обёрнутый в `observer`, запоминает, какие поля он прочитал при рендере, и перерисовывается, только когда меняются именно они.

```js
import { makeAutoObservable, autorun } from 'mobx'

class Counter {
  value = 0
  constructor() { makeAutoObservable(this) }
  inc() { this.value++ }
}

const counter = new Counter()
autorun(() => console.log('value =', counter.value)) // value = 0
counter.inc()                                        // value = 1
```

`makeAutoObservable(this)` проходит по объекту:

- поля становятся observable;
- методы — действиями (action);
- геттеры — вычисляемыми значениями (computed).

`autorun` делает для функции то же, что `observer` делает для компонента: запускает её и перезапускает, когда меняются прочитанные поля.

Стор — **один экземпляр на всё приложение**, экспортированный из модуля. Модуль ES выполняется один раз, поэтому все `import canvasState from '../store/canvasState.ts'` получают один и тот же объект. Провайдер и контекст не нужны.

> **Под капотом** — в сторе будут храниться DOM-элемент `<canvas>` и объект `WebSocket`. MobX не превращает их в observable-прокси: глубокое наблюдение применяется только к простым объектам, массивам, `Map` и `Set`. Экземпляры классов, в том числе DOM-узлы, хранятся как есть, observable только сама ссылка (*проверено*: простой объект в поле стора превращается в объект с геттерами и сеттерами, а экземпляр класса — нет). Поэтому `canvasState.canvas.getContext('2d')` работает с настоящим элементом.

### 4.2. Сторы на TypeScript

```ts
// store/canvasState.ts — начальная версия (поля добавляются в главах 8, 11, 12)
import { makeAutoObservable } from 'mobx'

class CanvasState {
  canvas: HTMLCanvasElement | null = null

  constructor() {
    makeAutoObservable(this)
  }

  setCanvas(canvas: HTMLCanvasElement) {
    this.canvas = canvas
  }
}

export default new CanvasState()
```

```ts
// store/toolState.ts — начальная версия (сеттеры цвета и толщины — в главе 7)
import { makeAutoObservable } from 'mobx'
import type Tool from '../tools/Tool.ts'

class ToolState {
  tool: Tool | null = null

  constructor() {
    makeAutoObservable(this)
  }

  setTool(tool: Tool) {
    this.tool = tool
  }
}

export default new ToolState()
```

- **`HTMLCanvasElement | null = null`.** Пока `Canvas` не смонтирован, холста нет, и тип честно говорит об этом. Плата за честность — проверка на `null` везде, где стор читают. Зато код не упадёт, если кнопку нажмут до появления холста.
- **Поле инициализировано.** Без `= null` код не скомпилируется: строгий режим требует, чтобы поле получило значение в объявлении или в конструкторе (TS2564, *проверено*).
- **`import type`.** Из `Tool.ts` нужен только тип. С `verbatimModuleSyntax` такой импорт обязан быть помечен `type` и полностью исчезает из собранного JS.
- **`setTool(tool: Tool)` без `null`.** Сбрасывать инструмент нигде не нужно, поэтому тип параметра уже, чем тип поля.

> **Под капотом** — `target: "es2023"` в `tsconfig.app.json` включает `useDefineForClassFields`: поля класса создаются через `Object.defineProperty` до тела конструктора, как в стандартном JavaScript. `makeAutoObservable` в конструкторе видит уже созданные поля и делает их observable (*проверено*: `isObservableProp(store, 'canvas') === true`, `autorun` срабатывает на `setCanvas`). При старой семантике (`useDefineForClassFields: false`) поле без инициализатора вообще не создавалось бы на объекте. Тогда оно молча осталось бы нереактивным, поэтому инициализировать поля стора стоит всегда.

### 4.3. Холст попадает в стор

```tsx
// components/Canvas/Canvas.tsx
const Canvas = observer(() => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current) return
    canvasState.setCanvas(canvasRef.current)
    toolState.setTool(new Brush(canvasRef.current))   // инструмент по умолчанию, глава 6
  }, [])
  // ...
})
```

Почему в `useEffect`, а не в теле компонента: `ref.current` заполняется после того, как React вставит элемент в DOM, а во время рендера там ещё `null`. Проверка `if (!canvasRef.current)` нужна TypeScript: в эффекте элемент уже есть, но компилятор этого не знает.

---

## Глава 5. Canvas API: что нужно знать до инструментов

**Цель главы:** понять модель рисования на холсте, на которой держатся все инструменты.

### 5.1. Холст — это пиксели

`<canvas>` — растровая картинка с программным интерфейсом рисования. Объектов внутри нет: нарисованный прямоугольник сразу становится пикселями, его нельзя потом выбрать и сдвинуть.

```js
const canvas = document.createElement('canvas')
canvas.width = 200
canvas.height = 100
const ctx = canvas.getContext('2d')

ctx.lineWidth = 4
ctx.beginPath()          // начать новый путь
ctx.moveTo(10, 10)       // перо в точку, без линии
ctx.lineTo(100, 50)      // линия до точки (пока только в пути)
ctx.stroke()             // обвести путь — теперь это пиксели
console.log(ctx.getImageData(55, 30, 1, 1).data[3] > 0) // true — пиксель на линии закрашен
```

Рисование идёт через **путь** (path):

- `beginPath` очищает текущий путь;
- `moveTo`, `lineTo`, `rect`, `arc` добавляют в него фигуры;
- `stroke` обводит путь, `fill` заливает.

Без `beginPath` следующий `stroke()` заново обведёт и все старые фигуры пути.

> **Внимание** — размер холста задаётся атрибутами `width`/`height`: это разрешение в пикселях, по умолчанию 300 × 150. CSS этот размер не меняет. Если задать в CSS `width: 600px` без атрибута, холст 300 × 150 растянется вдвое. Линии станут размытыми, а координаты мыши перестанут совпадать с пикселями.

### 5.2. Контекст и его состояние

`fillStyle`, `strokeStyle`, `lineWidth`, `lineCap`, `globalCompositeOperation` — свойства **контекста**, а не отдельной фигуры. Каждый следующий `stroke()` и `fill()` берёт их текущие значения.

```js
const ctx = document.createElement('canvas').getContext('2d')
ctx.lineWidth = '5'           // строка — контекст приводит её к числу
console.log(ctx.lineWidth)    // 5
ctx.lineWidth = 'abc'         // некорректное значение молча игнорируется
console.log(ctx.lineWidth)    // 5
```

`canvas.getContext('2d')` при каждом вызове возвращает **один и тот же объект**, так требует спецификация HTML. Все, кто рисует на холсте, делят одно состояние. Из этого вытекают сразу три последствия, которые встретятся дальше:

- выбранный цвет сохраняется при смене инструмента (глава 7);
- инструмент, который меняет цвет и не возвращает его обратно, «заражает» остальные (глава 6, ластик);
- отрисовка чужого штриха может поменять ваш цвет (глава 13).

Защита одна: `ctx.save()` перед изменением состояния и `ctx.restore()` после. `save` кладёт в стек всё состояние рисования: стили, толщину, режим наложения, трансформации. `restore` возвращает его. Текущий путь в это состояние **не** входит.

### 5.3. Координаты мыши

Наивный вариант — позиция курсора относительно страницы минус отступ холста:

```js
const x = e.pageX - e.target.offsetLeft
```

Проблемы у него две:

- `offsetLeft` считается от ближайшего позиционированного родителя, а не от страницы, поэтому координаты «плывут», как только вёрстка усложнится;
- в TypeScript он не компилируется: `e.target` имеет тип `EventTarget | null`, а у `EventTarget` нет `offsetLeft`.

Рабочий вариант — `e.offsetX` / `e.offsetY`: координаты курсора сразу относительно элемента, на котором произошло событие.

```ts
canvas.onmousedown = (e: MouseEvent) => {
  console.log(e.offsetX, e.offsetY) // клик в левый верхний угол холста — 0 0
}
```

### 5.4. Почему инструменты — классы, а не компоненты

Мышь двигается десятки раз в секунду. Если превращать каждое движение в `setState`, React будет перерисовывать компонент без пользы: пиксели хранит сам холст, и виртуальному DOM нечего сравнивать. Поэтому рисование вынесено в обычные классы, которые вешают обработчики прямо на DOM-элемент `<canvas>`. React отвечает за разметку вокруг холста, классы — за то, что происходит внутри него.

---

## Глава 6. Инструменты рисования

**Цель главы:** написать пять инструментов, которые рисуют локально. В главе 13 они научатся отправлять свои действия по сети, а здесь закладывается их устройство.

### 6.1. Базовый класс `Tool`

```ts
// tools/Tool.ts — локальная версия (отправка по сети — в главе 13)
export default class Tool {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('2D context is not supported')

    this.canvas = canvas
    this.ctx = ctx
    this.destroyEvents()
  }

  destroyEvents() {
    this.canvas.onmousemove = null
    this.canvas.onmousedown = null
    this.canvas.onmouseup = null
  }
}
```

**Почему свойства `onmouse*`, а не `addEventListener`.** У свойства может быть только одно значение, поэтому новый инструмент **заменяет** обработчики старого. С `addEventListener` обработчики бы накапливались, и после выбора прямоугольника кисть продолжала бы рисовать. `destroyEvents()` в конструкторе явно сбрасывает старые обработчики перед подпиской.

**`getContext('2d')` может вернуть `null`**, если у холста уже взят контекст другого типа (например, `webgl`). Проверка в конструкторе сужает тип один раз, и дальше `this.ctx` используется без `?.` и `!`.

### 6.2. Кисть

```ts
// tools/Brush.ts — локальная версия
import Tool from './Tool.ts'

export default class Brush extends Tool {
  mouseDown = false

  constructor(canvas: HTMLCanvasElement) {
    super(canvas)
    this.listen()
  }

  listen() {
    this.canvas.onmousemove = this.mouseMoveHandler.bind(this)
    this.canvas.onmousedown = this.mouseDownHandler.bind(this)
    this.canvas.onmouseup = this.mouseUpHandler.bind(this)
  }

  mouseUpHandler() {
    this.mouseDown = false
  }

  mouseDownHandler(e: MouseEvent) {
    this.mouseDown = true
    this.ctx.beginPath()
    this.ctx.moveTo(e.offsetX, e.offsetY)
  }

  mouseMoveHandler(e: MouseEvent) {
    if (this.mouseDown) {
      this.draw(e.offsetX, e.offsetY)
    }
  }

  draw(x: number, y: number) {
    this.ctx.lineTo(x, y)
    this.ctx.stroke()
  }
}
```

Логика простая. Нажали кнопку — начали новый путь в точке курсора. Ведём мышь с зажатой кнопкой — тянем линию до новой точки и сразу обводим. Отпустили — перестали. Флаг `mouseDown` нужен, потому что `mousemove` срабатывает и без нажатой кнопки.

**Зачем `.bind(this)`.** Браузер вызывает обработчик с `this`, равным элементу (`canvas`), а не экземпляру `Brush`.

```js
class A {
  name = 'A'
  show() { console.log(this?.name) }
}
const a = new A()
const plain = a.show
plain()            // undefined — метод оторван от объекта, в классе this === undefined
a.show.bind(a)()   // A
```

**Почему `bind`, а не стрелочные функции-поля** (`mouseDownHandler = (e) => {...}`). Стрелочное поле создаётся заново на каждом экземпляре и не попадает в прототип. Наследник не сможет вызвать его через `super.mouseDownHandler(e)`, а ластик (раздел 6.6) построен именно на наследовании от кисти.

**`MouseEvent`** — тип нативного события DOM, а не события React: обработчик висит на `canvas.onmousedown` напрямую. Тип свойства `onmousedown` в DOM — `((this: GlobalEventHandlers, ev: MouseEvent) => any) | null`, поэтому TypeScript сам проверяет, что метод принимает `MouseEvent`.

> **Под капотом** — порядок инициализации при `new Brush(canvas)`. Сначала выполняется конструктор `Tool` (`super(canvas)`): он сохраняет `canvas` и `ctx` и сбрасывает обработчики. Затем инициализируются поля самого `Brush` (`mouseDown = false`), и только потом выполняется остаток конструктора `Brush` (`this.listen()`). Поэтому `Tool` не может обратиться к полям наследника: в момент работы его конструктора их ещё нет.

### 6.3. Прямоугольник: предпросмотр фигуры

Пока мышь тянется, прямоугольник должен следовать за курсором, а после отпускания остаться на холсте.

Наивный вариант — рисовать прямоугольник на каждом `mousemove`:

```ts
mouseMoveHandler(e: MouseEvent) {
  if (this.mouseDown) {
    this.ctx.rect(this.startX, this.startY, e.offsetX - this.startX, e.offsetY - this.startY)
    this.ctx.stroke()
  }
}
```

Проблема: холст ничего не забывает. После протягивания мыши на нём остаётся веер из сотен прямоугольников, по одному на каждое событие.

Значит, на `mousedown` нужно сохранить снимок холста, а на каждом `mousemove` восстанавливать снимок и рисовать поверх один прямоугольник. Частый способ сделать снимок — PNG-строка:

```js
mouseDownHandler(e) {
  this.saved = this.canvas.toDataURL()           // "data:image/png;base64,..."
}

draw(x, y, w, h) {
  const img = new Image()
  img.src = this.saved
  img.onload = () => {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.ctx.drawImage(img, 0, 0)
    this.ctx.beginPath()
    this.ctx.rect(x, y, w, h)
    this.ctx.fill()
    this.ctx.stroke()
  }
}
```

Это работает, но есть две проблемы:

- **Асинхронность.** Картинка декодируется в фоне, а рисование ждёт `onload`. При быстром движении мыши за один кадр создаётся несколько `Image`, восстановление отстаёт от события, и фигура мерцает.
- **Цена.** Каждый `mousemove` — это полное кодирование холста в PNG и base64 и обратное декодирование.

Рабочий вариант — снимок пикселей `getImageData` / `putImageData`:

```ts
// tools/Rect.ts — локальная версия
import Tool from './Tool.ts'

export default class Rect extends Tool {
  mouseDown = false
  startX = 0
  startY = 0
  saved: ImageData | null = null

  constructor(canvas: HTMLCanvasElement) {
    super(canvas)
    this.listen()
  }

  listen() {
    this.canvas.onmousemove = this.mouseMoveHandler.bind(this)
    this.canvas.onmousedown = this.mouseDownHandler.bind(this)
    this.canvas.onmouseup = this.mouseUpHandler.bind(this)
  }

  mouseUpHandler() {
    this.mouseDown = false
  }

  mouseDownHandler(e: MouseEvent) {
    this.mouseDown = true
    this.startX = e.offsetX
    this.startY = e.offsetY
    this.saved = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)
  }

  mouseMoveHandler(e: MouseEvent) {
    if (this.mouseDown) {
      const width = e.offsetX - this.startX
      const height = e.offsetY - this.startY
      this.draw(this.startX, this.startY, width, height)
    }
  }

  draw(x: number, y: number, w: number, h: number) {
    if (this.saved) this.ctx.putImageData(this.saved, 0, 0)
    this.ctx.beginPath()
    this.ctx.rect(x, y, w, h)
    this.ctx.fill()
    this.ctx.stroke()
  }
}
```

| | `toDataURL` + `Image` | `getImageData` / `putImageData` |
|---|---|---|
| Снимок | PNG, закодированный в base64-строку | сырые пиксели RGBA (`Uint8ClampedArray`) |
| Восстановление | асинхронно, в `img.onload` | синхронно, сразу |
| Цена на `mousemove` | кодирование и декодирование PNG | копирование 600 × 400 × 4 = 960 000 байт |
| Нужен `clearRect` | да | нет: `putImageData` заменяет пиксели целиком, включая прозрачные |

- **`beginPath()` перед `rect()`** обязателен. Без него путь копит все прямоугольники предпросмотра, и `stroke()` обведёт их разом поверх восстановленного снимка.
- **Отрицательные `w` и `h`** получаются, когда мышь ведут влево или вверх от точки нажатия. `rect()` их принимает и рисует прямоугольник в обратную сторону.
- **`saved: ImageData | null = null`** — до первого нажатия снимка нет. Проверка `if (this.saved)` сужает тип.

> **Внимание** — `putImageData` игнорирует трансформации контекста (`translate`, `scale`), `globalAlpha` и режим наложения: пиксели копируются как есть, по координатам холста. Здесь это и нужно, ведь снимок восстанавливается пиксель в пиксель. Но если позже понадобится масштабировать холст (`ctx.scale` для экранов с высокой плотностью пикселей), снимок придётся восстанавливать через `drawImage`.

> **На заметку** — другой распространённый приём для предпросмотра — второй прозрачный `<canvas>` поверх основного. Фигура рисуется на верхнем слое и стирается с него целиком, а на нижний попадает только на `mouseup`. Снимок тогда не нужен вовсе.

### 6.4. Круг

Устроен как прямоугольник: тот же снимок и те же поля. Отличаются расчёт размера и фигура.

```ts
// tools/Circle.ts — локальная версия, отличия от Rect.ts
mouseMoveHandler(e: MouseEvent) {
  if (this.mouseDown) {
    const r = Math.hypot(e.offsetX - this.startX, e.offsetY - this.startY)
    this.draw(this.startX, this.startY, r)
  }
}

draw(x: number, y: number, r: number) {
  if (this.saved) this.ctx.putImageData(this.saved, 0, 0)
  this.ctx.beginPath()
  this.ctx.arc(x, y, r, 0, 2 * Math.PI)
  this.ctx.fill()
  this.ctx.stroke()
}
```

Точка нажатия — **центр** круга, курсор задаёт точку на окружности. Радиус — расстояние между ними, то есть гипотенуза прямоугольного треугольника с катетами `dx` и `dy`:

```js
const dx = 3, dy = 4
console.log(Math.sqrt(dx ** 2 + dy ** 2)) // 5
console.log(Math.hypot(dx, dy))           // 5
```

`Math.hypot` делает то же самое, но не переполняется на очень больших числах. Для координат холста разницы нет, зато в коде сразу видно, что считается расстояние.

`arc(x, y, r, startAngle, endAngle)` рисует дугу с центром `(x, y)`. Углы задаются в **радианах** от направления «вправо», по часовой стрелке. Полный круг — от `0` до `2 * Math.PI` (360°).

### 6.5. Линия

```ts
// tools/Line.ts — локальная версия, отличия от Rect.ts
mouseMoveHandler(e: MouseEvent) {
  if (this.mouseDown) {
    this.draw(e.offsetX, e.offsetY)
  }
}

draw(x: number, y: number) {
  if (this.saved) this.ctx.putImageData(this.saved, 0, 0)
  this.ctx.beginPath()
  this.ctx.moveTo(this.startX, this.startY)
  this.ctx.lineTo(x, y)
  this.ctx.stroke()
}
```

Чем линия отличается от кисти. У кисти каждый `mousemove` **добавляет** отрезок к одному растущему пути, и холст не восстанавливается. У линии на каждом `mousemove` холст откатывается к снимку, а путь строится **заново**: в нём всегда ровно один отрезок «начало → курсор».

```js
// кисть: путь копится — после трёх движений в нём три отрезка
ctx.beginPath(); ctx.moveTo(0, 0)
for (const [x, y] of [[10, 0], [20, 5], [30, 0]]) { ctx.lineTo(x, y); ctx.stroke() }

// линия: путь каждый раз новый — в нём один отрезок до последней точки
for (const [x, y] of [[10, 0], [20, 5], [30, 0]]) {
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(x, y); ctx.stroke()
}
```

Без восстановления снимка второй цикл оставил бы три луча из одной точки. У отрезка нет площади, поэтому `fill()` не вызывается, а цвет линии задаёт `strokeStyle`.

### 6.6. Ластик

Ластик — это кисть, у которой переопределена только отрисовка. Обработчики мыши и начало пути он наследует от `Brush`, ведь `Brush.mouseMoveHandler` вызывает `this.draw(...)`, а у экземпляра ластика это уже его собственный метод.

Наивный вариант — закрашивать белым:

```ts
override draw(x: number, y: number) {
  this.ctx.strokeStyle = 'white'
  this.ctx.lineTo(x, y)
  this.ctx.stroke()
}
```

Проблемы две:

1. **Цвет «протекает».** `strokeStyle` — общее состояние контекста (раздел 5.2). После ластика кисть, прямоугольник и линия обводят белым, пока цвет не выберут заново.
2. **Белый — это не фон.** Белым холст делает CSS, а сами пиксели изначально **прозрачные**. Сохраните картинку в PNG (глава 8), и фон окажется прозрачным, а следы ластика — белыми полосами.

Рабочий вариант — режим наложения `destination-out` внутри `save()` / `restore()`:

```ts
// tools/Eraser.ts — локальная версия
import Brush from './Brush.ts'

export default class Eraser extends Brush {
  override draw(x: number, y: number) {
    this.ctx.save()
    this.ctx.globalCompositeOperation = 'destination-out'
    this.ctx.lineTo(x, y)
    this.ctx.stroke()
    this.ctx.restore()
  }
}
```

| `globalCompositeOperation` | Что происходит под штрихом |
|---|---|
| `source-over` (по умолчанию) | новые пиксели рисуются поверх старых |
| `destination-out` | старые пиксели **удаляются** там, где проходит штрих; цвет штриха не важен, важны только форма и непрозрачность |

Стёртые места становятся прозрачными, как нетронутый фон холста. Сквозь них виден белый CSS-фон, а в PNG они прозрачные, как и весь остальной фон. `save()` / `restore()` возвращают режим наложения, и на другие инструменты ластик не влияет. Текущий путь при этом не сбрасывается, так что штрих продолжает расти, как у кисти.

- **`override`** — явная пометка, что метод переопределяет метод родителя. Если `draw` у `Brush` переименуют, TypeScript сообщит об ошибке, а не создаст молча новый метод.
- **Конструктор не объявлен.** Конструктор по умолчанию сам передаёт аргументы родителю.

> **Под капотом** — `stroke()` каждый раз обводит **весь** текущий путь, а не только новый отрезок. С непрозрачным цветом это незаметно: те же пиксели закрашиваются тем же цветом. У ластика тоже: повторно стирать уже прозрачные пиксели безопасно. А кисть полупрозрачного цвета (`rgba(..., 0.5)`) темнела бы с каждым движением мыши, ведь начало штриха обводится десятки раз. Это одна из причин, по которым в главе 13 кисть перейдёт на рисование отдельными отрезками.

### 6.7. Выбор инструмента

```tsx
// components/Toolbar/Toolbar.tsx
import type Tool from '../../tools/Tool.ts'

type ToolClass = new (canvas: HTMLCanvasElement) => Tool

const selectTool = (ToolClass: ToolClass) => {
  if (canvasState.canvas) toolState.setTool(new ToolClass(canvasState.canvas))
}

<button type="button" className={`${styles.btn} ${styles.brush}`}
        aria-label="Кисть" onClick={() => selectTool(Brush)} />
<button type="button" className={`${styles.btn} ${styles.rect}`}
        aria-label="Прямоугольник" onClick={() => selectTool(Rect)} />
```

`new (canvas: HTMLCanvasElement) => Tool` — тип **конструктора** (construct signature): «то, что можно вызвать через `new` с холстом и получить `Tool`». Под него подходят все пять инструментов. Передаётся сам класс, а не экземпляр, поэтому экземпляр создаётся только тогда, когда холст точно есть. Проверка на `null` пишется один раз, а не у каждой кнопки.

Инструмент по умолчанию — кисть, она создаётся в `Canvas` вместе с передачей холста в стор (раздел 4.3). В `StrictMode` этот эффект выполняется дважды и создаёт две кисти. Это безопасно: вторая заменяет обработчики первой через свойства `onmouse*`, и первая становится мусором.

---

## Глава 7. Цвет и толщина линии

**Цель главы:** связать поля ввода с контекстом холста и понять, где на самом деле хранятся настройки.

### 7.1. Цепочка: поле → стор → инструмент → контекст

```ts
// tools/Tool.ts
set fillColor(color: string) {
  this.ctx.fillStyle = color
}

set strokeColor(color: string) {
  this.ctx.strokeStyle = color
}

set lineWidth(width: number) {
  this.ctx.lineWidth = width
}
```

```ts
// store/toolState.ts
setFillColor(color: string) {
  if (this.tool) this.tool.fillColor = color
}

setStrokeColor(color: string) {
  if (this.tool) this.tool.strokeColor = color
}

setLineWidth(width: number) {
  if (this.tool) this.tool.lineWidth = width
}
```

Сеттер класса (`set fillColor`) снаружи выглядит как присваивание свойства (`tool.fillColor = color`), а на деле вызывает функцию. Стор не знает, как инструмент хранит цвет: сейчас это контекст, но могло бы быть и собственное поле.

**`if (this.tool)`, а не `this.tool?.fillColor = color`.** Опциональную цепочку нельзя ставить слева от присваивания: `a?.b = 1` — синтаксическая ошибка JavaScript, а не только TypeScript. Без проверки код упал бы с `TypeError`, если инструмент ещё не создан.

### 7.2. Настройки живут в контексте

`getContext('2d')` возвращает один и тот же объект (раздел 5.2), поэтому все экземпляры инструментов пишут в одно состояние. Выбранный цвет и толщина сохраняются при смене инструмента, хотя каждый раз создаётся новый экземпляр `Tool`.

Значения по умолчанию в интерфейсе совпадают с начальными значениями контекста: `<input type="color">` без значения показывает `#000000`, а `defaultValue={1}` у толщины соответствует `lineWidth = 1`. Поэтому интерфейс и холст не расходятся до первого изменения.

> **Внимание** — источник истины здесь — контекст, а поля только пишут в него, ничего не читая. Если когда-нибудь пересоздать `<canvas>` (например, при смене сессии без перезагрузки страницы), у нового холста будет новый контекст со значениями по умолчанию, а поля продолжат показывать старый цвет и толщину.

### 7.3. Толщина линии

```tsx
// components/SettingBar/SettingBar.tsx
<input
  id="line-width"
  className={styles.lineWidth}
  type="number"
  defaultValue={1}
  min={1}
  max={50}
  onChange={(e) => {
    const width = e.target.valueAsNumber
    if (width > 0) toolState.setLineWidth(width)
  }}
/>
<input
  id="stroke-color"
  type="color"
  onChange={(e) => toolState.setStrokeColor(e.target.value)}
/>
```

Наивный вариант — передать в стор `e.target.value`. У поля-числа это всегда **строка** (`"5"`). Контекст сам приведёт её к числу, но сеттер с типом `number` строку не примет, и TypeScript выдаст ошибку.

Рабочий вариант — `e.target.valueAsNumber`. Он возвращает число, а для пустого или некорректного ввода — `NaN`. Проверка `width > 0` одной строкой отсекает и `NaN`, и ноль: любое сравнение с `NaN` даёт `false`.

Тип `e` выводится сам: внутри `onChange` у `<input>` TypeScript знает, что это `React.ChangeEvent<HTMLInputElement>`. Если вынести обработчик в отдельную функцию, тип придётся указать явно.

> **Внимание** — `min` и `max` ограничивают только стрелки поля и проверку формы, но не ручной ввод. Напечатать `500` можно, и холст примет такую толщину. Если ограничение важно, его проверяют в обработчике.

### 7.4. Цвет на панели инструментов

```tsx
// components/Toolbar/Toolbar.tsx
const changeColor = (color: string) => {
  toolState.setStrokeColor(color)
  toolState.setFillColor(color)
}

<input
  type="color"
  className={styles.color}
  aria-label="Цвет"
  onChange={(e) => changeColor(e.target.value)}
/>
```

Роли двух полей цвета разделены. Цвет на панели инструментов — «основной»: он задаёт и обводку, и заливку. Кисть, линия и ластик используют обводку, прямоугольник и круг — обе. Поле «Цвет обводки» в панели настроек меняет только обводку. Например, жёлтый прямоугольник с чёрной рамкой: на панели инструментов выбрать жёлтый, в настройках — чёрный.

Оба поля пишут в одно свойство `strokeStyle` и ни одно его не читает. Поэтому после выбора цвета на панели инструментов поле «Цвет обводки» продолжает показывать старое значение, хотя обводка уже другая: действует то поле, которое меняли последним. Синхронизировать их можно, только если хранить цвета в сторе как observable-поля и сделать оба поля управляемыми (`value` из стора).

Значение `<input type="color">` — всегда строка `#rrggbb` в нижнем регистре. Контекст принимает её как есть и при чтении `ctx.fillStyle` возвращает тот же формат. Это пригодится в главе 13, где цвет фигуры отправляется по сети.

---

## Глава 8. История действий и сохранение картинки

**Цель главы:** сделать отмену и повтор действий и скачивание рисунка в PNG.

### 8.1. Два способа хранить историю

| Способ | Что хранится | Плюсы | Минусы |
|---|---|---|---|
| Снимки | всё изображение перед каждым действием | просто, работает для любого инструмента | память: каждый шаг — отдельная копия холста |
| Команды (Command) | описание действия: «линия из A в B, цвет, толщина» | мало памяти, легко передать по сети | для каждого действия нужна функция отрисовки, отмена = перерисовать всё без последней команды |

Здесь выбраны снимки: это проще и подходит для любого инструмента. Ограничения этого выбора для совместного рисования разобраны в главе 13.

### 8.2. Стор с историей

```ts
// store/canvasState.ts — история (поля сессии добавятся в главах 11–12)
import { makeAutoObservable } from 'mobx'

const MAX_HISTORY = 50

class CanvasState {
  canvas: HTMLCanvasElement | null = null
  undoList: ImageData[] = []
  redoList: ImageData[] = []

  constructor() {
    makeAutoObservable(this)
  }

  setCanvas(canvas: HTMLCanvasElement) {
    this.canvas = canvas
  }

  get ctx() {
    return this.canvas?.getContext('2d') ?? null
  }

  snapshot() {
    if (!this.canvas || !this.ctx) return null
    return this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)
  }

  pushToUndo(data: ImageData) {
    this.undoList.push(data)
    if (this.undoList.length > MAX_HISTORY) this.undoList.shift()
    this.redoList = []
  }

  undo() {
    const current = this.snapshot()
    const previous = this.undoList.pop()
    if (!current || !previous) return

    this.redoList.push(current)
    this.ctx?.putImageData(previous, 0, 0)
  }

  redo() {
    const current = this.snapshot()
    const next = this.redoList.pop()
    if (!current || !next) return

    this.undoList.push(current)
    this.ctx?.putImageData(next, 0, 0)
  }
}

export default new CanvasState()
```

Undo перекладывает текущее состояние в redo и восстанавливает предыдущее, redo делает наоборот. Порядок внутри `undo` важен: сначала снимок текущего состояния, потом восстановление. Если поменять местами, в redo попадёт уже восстановленное состояние, и redo станет бесполезным.

**Снимки — `ImageData`, а не строки PNG.** Наивный вариант хранит `canvas.toDataURL()` и восстанавливает через `new Image()` + `onload`. Восстановление тогда асинхронное, и это даёт гонку. При двух быстрых нажатиях undo второй вызов делает снимок раньше, чем первый успел нарисовать картинку, и в redo уходит **не то** состояние. `putImageData` синхронен: к следующей строке кода холст уже изменён.

**Лимит истории.** Цена синхронности — память. `ImageData` хранит пиксели без сжатия: 600 × 400 × 4 = 960 000 байт на снимок, то есть 50 шагов — около 48 МБ. Когда история переполняется, `shift()` выбрасывает самый старый снимок. Так ограничивают историю почти все редакторы.

**Новое действие очищает redo.** «Будущее», которое отменили, больше не наступит. Без `this.redoList = []` последовательность «отменить → нарисовать новое → повторить» вернула бы старый рисунок, уже не связанный с текущим.

**Undo с пустой историей ничего не делает.** Так и должно быть, а не «очищать холст». Первое же действие кладёт в историю снимок холста до него, поэтому отмена до начала и так возвращает исходное состояние. А в главе 14 холст при открытии загружается с сервера, и очистка стёрла бы загруженный рисунок.

**`get ctx()`** — геттер, который `makeAutoObservable` делает вычисляемым значением. `?? null` нужен, чтобы тип был `CanvasRenderingContext2D | null`: на `null`-холсте `?.` дал бы `undefined`.

Проверено на имитации холста — объекте с `getImageData`/`putImageData` (*проверено*):

```
действия: A, B
undo -> A
undo -> blank
undo (пусто) -> blank            ← ничего не происходит
redo -> A
redo после нового действия: 0    ← redo очищен
история после 60 действий: 50    ← лимит
```

### 8.3. Подключение

Снимок делается при нажатии мыши на холсте, то есть перед действием:

```tsx
// components/Canvas/Canvas.tsx
const mouseDownHandler = () => {
  const data = canvasState.snapshot()
  if (data) canvasState.pushToUndo(data)
}

<canvas ref={canvasRef} className={styles.canvas} width={600} height={400}
        onMouseDown={mouseDownHandler} />
```

```tsx
// components/Toolbar/Toolbar.tsx
<button type="button" className={`${styles.btn} ${styles.undo}`}
        aria-label="Отменить" onClick={() => canvasState.undo()} />
<button type="button" className={`${styles.btn} ${styles.redo}`}
        aria-label="Повторить" onClick={() => canvasState.redo()} />
```

> **Под капотом** — на холсте два обработчика `mousedown`: нативный `canvas.onmousedown` инструмента и React-обработчик `onMouseDown`. Нативный срабатывает первым, на самом элементе. React-обработчик срабатывает позже: с React 17 события делегируются на корневой контейнер, куда событие доходит всплытием. Оба видят холст до изменений, ведь рисование начинается с `mousemove`. Тот же порядок действует и для `mouseup`, это понадобится в главе 14.

**`onClick={() => canvasState.undo()}`, а не `onClick={canvasState.undo}`.** Метод, переданный без вызова, теряет `this` (раздел 6.2), и обращение `this.snapshot()` внутри `undo` упало бы. `makeAutoObservable` сам методы не привязывает, если не передать опцию `{ autoBind: true }`.

> **Внимание** — снимок делается на **каждое** нажатие мыши, даже если ничего не нарисовано: например, на клик прямоугольником без протягивания. Undo после такого «пустого» шага визуально ничего не меняет. Исправить можно, если снимок «до действия» хранить отдельно и класть его в историю на `mouseup`, только когда холст изменился.

### 8.4. Сохранение в PNG

```tsx
// components/Toolbar/Toolbar.tsx
const download = () => {
  canvasState.canvas?.toBlob((blob) => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${canvasState.sessionId ?? 'paint'}.png`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url))
  })
}

<button type="button" className={`${styles.btn} ${styles.save}`}
        aria-label="Сохранить" onClick={download} />
```

Механизм — ссылка `<a download>`, по которой кликают программно. Атрибут `download` говорит браузеру «скачать, а не открыть», его значение — имя файла. Имя — id сессии (глава 11) или `paint`, пока сессии нет.

Наивный вариант — `a.href = canvas.toDataURL()`. Он работает, но вся картинка оказывается в base64 прямо в строке адреса:

| | `toDataURL()` | `toBlob()` + `createObjectURL` |
|---|---|---|
| Кодирование | синхронное, блокирует страницу на время сжатия PNG | асинхронное, результат в колбэке |
| Размер | base64 — на треть больше самих байтов | байты как есть |
| Строка адреса | вся картинка, сотни килобайт | `blob:http://localhost:5173/3f2a...` |
| Освобождение памяти | строку соберёт сборщик мусора | вручную: `URL.revokeObjectURL` |

- **`revokeObjectURL` отложен через `setTimeout`.** Пока object URL не отозван, браузер держит `Blob` в памяти до закрытия вкладки. Но скачивание после `a.click()` может начаться не сразу, и отзыв в той же строке рискует оборвать его раньше, чем браузер прочитает данные.
- **Ссылку не нужно добавлять в документ.** Современные браузеры запускают скачивание и по ссылке вне документа. Связку `appendChild` → `click` → `removeChild` требовали только старые версии Firefox.
- **`blob` может быть `null`**, например, если у холста нулевой размер. Тип колбэка — `(blob: Blob | null) => void`, поэтому проверка обязательна.
- **Расширение `.png`.** `toBlob` и `toDataURL` без аргументов кодируют PNG. Файл с PNG внутри и расширением `.jpg` откроется, ведь программы определяют формат по содержимому, но обманет и человека, и некоторые сервисы.

> **На заметку** — фон в скачанном файле **прозрачный**: белым холст делает CSS, а не пиксели. Если нужен белый фон, картинку накладывают на временный холст, залитый белым: `tmp.fillStyle = 'white'`, `tmp.fillRect(0, 0, w, h)`, `tmp.drawImage(canvas, 0, 0)`, и `toBlob` вызывают уже у временного холста. В JPEG прозрачности нет вовсе: при `toBlob(cb, 'image/jpeg')` прозрачные пиксели станут чёрными.

---

## Глава 9. Серверный проект: Express 5, ESM и CORS

**Цель главы:** создать сервер и разобраться, почему браузер вообще пускает клиент к нему.

### 9.1. Создание проекта

```bash
mkdir server && cd server
npm init -y
npm pkg set type=module main=src/index.js scripts.dev="node --watch src/index.js" scripts.start="node src/index.js"
npm pkg delete scripts.test
npm install express express-ws cors
```

`npm pkg set` / `npm pkg delete` правят поля `package.json` по пути через точку (`scripts.dev`), без ручного редактирования файла.

- **`"type": "module"`** включает ESM: `import` вместо `require`.
- **`express`** — HTTP-сервер.
- **`express-ws`** — WebSocket поверх Express, внутри использует пакет `ws`.
- **`cors`** — разрешает браузеру запросы к серверу со страницы другого источника (раздел 9.3).

### 9.2. `node --watch` вместо nodemon

`node --watch` перезапускает процесс при изменении файлов, которые он импортирует. С Node 22 это стабильная возможность, отдельный пакет не нужен.

| | `node --watch` | nodemon |
|---|---|---|
| Установка | встроен в Node | пакет в `devDependencies` |
| Что отслеживает | файлы, которые реально импортированы | всю папку по расширениям |
| Дополнительные пути | `--watch-path=./src` | `--watch`, `--ignore`, `nodemon.json` |
| Ручной перезапуск | нет | команда `rs` в консоли |
| TypeScript | `node --watch index.ts` (Node 24 сам удаляет типы) | через `--exec` и отдельный пакет |

nodemon нужен в проектах, где перезапуск должен реагировать на файлы, которые не импортируются через `import`, например шаблоны. Здесь хватает встроенного режима.

> **Внимание** — перезапуск убивает процесс вместе со всеми WebSocket-соединениями. После каждого сохранения файла в `server/src` открытые вкладки клиента теряют связь с сервером. Клиент из главы 12 не переподключается сам, поэтому после правки сервера вкладки нужно обновить. Узнать оборванную вкладку можно по строке `Соединение закрыто` в консоли.

### 9.3. CORS

Клиент открыт на `http://localhost:5173`, сервер слушает `http://localhost:5000`. Порт — часть **источника** (origin: схема + хост + порт), поэтому это разные источники. По умолчанию браузер не даёт странице читать ответы чужого источника.

```bash
curl -i -H "Origin: http://localhost:5173" "http://localhost:5000/image?id=no-such-session"
# HTTP/1.1 404 Not Found
# Access-Control-Allow-Origin: *     ← этот заголовок ставит cors()
```

`cors()` без настроек отвечает `Access-Control-Allow-Origin: *`, то есть «читать может любой сайт». Для учебного проекта это нормально. В боевом проекте источник указывают явно: `cors({ origin: 'https://paint.example.com' })`.

> **Важно** — CORS — защита **браузера**, а не сервера. `curl` и Postman отправляют запросы без всяких проверок CORS, поэтому `cors()` не заменяет авторизацию. И ещё: **на WebSocket CORS не распространяется вовсе**. Браузер подключится к `ws://` с любой страницы, а `cors()` не влияет на WebSocket-маршруты. Если нужно ограничить, кто подключается, сервер сам проверяет заголовок `Origin` при рукопожатии.

### 9.4. Сборка приложения

```js
// src/app.js
import express from 'express'
import expressWs from 'express-ws'
import cors from 'cors'
import { imageRouter } from './routes/image.js'
import { registerWs } from './ws/index.js'

export const createApp = () => {
  const app = express()
  const wss = expressWs(app).getWss()

  app.use(cors())
  app.use(express.json())

  app.use(imageRouter)
  registerWs(app, wss)

  return app
}
```

```js
// src/config.js
import path from 'node:path'

export const PORT = process.env.PORT || 5000
export const FILES_DIR = path.join(import.meta.dirname, '..', 'files')
```

```js
// src/index.js
import { mkdir } from 'node:fs/promises'
import { createApp } from './app.js'
import { FILES_DIR, PORT } from './config.js'

await mkdir(FILES_DIR, { recursive: true })

const app = createApp()

app.listen(PORT, () => console.log(`server started on PORT ${PORT}`))
```

- **`index.js` отдельно от `app.js`.** `createApp()` собирает приложение, но не открывает порт. Так приложение можно поднять в тестах на любом порту, а запуск остаётся в одном коротком файле.
- **`expressWs(app)` до объявления маршрутов.** Вызов добавляет в `app` метод `.ws()`, а `getWss()` возвращает сам WebSocket-сервер. До этого вызова `app.ws` — `undefined`.
- **`import.meta.dirname`** — папка текущего модуля в ESM. Переменной `__dirname` в ESM нет. `FILES_DIR` указывает на `server/files` независимо от того, из какой папки запущен процесс.
- **`await` на верхнем уровне модуля** (top-level await) разрешён в ESM: папка для снимков создаётся до запуска сервера.
- **Расширение `.js` в импортах обязательно.** В ESM Node не подставляет расширение и не ищет `index.js` в папке. `import './ws'` упадёт с `ERR_MODULE_NOT_FOUND`, нужно `'./ws/index.js'`.
- **`.gitignore`**: `node_modules` и `files`. В `files` лежат снимки холстов, это данные пользователей, а не код.

---

## Глава 10. WebSocket на сервере: рукопожатие, кадры, протокол сообщений

**Цель главы:** понять, что происходит на уровне протокола, и построить на сервере маршрутизацию сообщений.

### 10.1. Рукопожатие

WebSocket начинается как обычный HTTP-запрос с просьбой сменить протокол (RFC 6455):

```
GET / HTTP/1.1
Host: localhost:5000
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
Sec-WebSocket-Version: 13
Origin: http://localhost:5173

HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
```

После ответа `101` то же TCP-соединение перестаёт быть HTTP: по нему в обе стороны идут **кадры** (frames).

`Sec-WebSocket-Accept` доказывает, что сервер действительно понимает WebSocket, а не случайно ответил на запрос. Вычисление можно повторить в Node:

```js
import { createHash } from 'node:crypto'

const key = 'dGhlIHNhbXBsZSBub25jZQ=='
const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11' // константа из RFC 6455
console.log(createHash('sha1').update(key + GUID).digest('base64'))
// s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
```

Схемы адресов: `ws://` — без шифрования, `wss://` — поверх TLS, как пара `http`/`https`. Страница, открытая по `https`, может подключаться только к `wss://`.

### 10.2. `express-ws`

```js
app.ws('/', (ws) => {
  ws.send('привет')
  ws.on('message', (msg) => console.log('Сообщение:', msg))
})
```

Колбэк `app.ws(path, handler)` вызывается **один раз на подключение**, а не на каждое сообщение. `ws` — объект этого соединения: `ws.send()` пишет клиенту, `ws.on('message')` принимает от него. Соединение живёт, пока одна из сторон его не закроет.

`wss.clients` — `Set` всех открытых соединений сервера, поэтому их число — `wss.clients.size`, а не `length`.

> **Под капотом** — `express-ws` встраивается в маршрутизатор Express хитростью. `app.ws('/')` регистрирует обычный `GET` на путь `/.websocket`. При входящем `Upgrade`-запросе библиотека переписывает `request.url`, добавляя `.websocket`, и прогоняет запрос через роутер. Так к WebSocket-маршрутам применяются те же middleware, что и к HTTP. Это видно в `node_modules/express-ws/lib/add-ws-method.js` и `websocket-url.js`. Клиент этого не замечает и подключается к `ws://localhost:5000/` (*проверено*). А обычный `GET /` при этом отвечает 404: маршрута на `/` нет.

> **Внимание** — WebSocket-маршрут нельзя вынести в `express.Router()`, как HTTP-маршруты: с Express 5 `express.Router().ws` — `undefined` (*проверено*). `express-ws` добавляет метод `.ws` на саму функцию `express.Router`, рассчитывая на устройство роутера Express 4, где эта функция одновременно была прототипом созданных роутеров. В Express 5 роутер вынесен в пакет `router` и устроен иначе. Поэтому маршрут регистрирует функция `registerWs(app, wss)`, которая получает само приложение: у `app` метод `.ws` есть.

### 10.3. Строки, объекты и байты

Кадр бывает **текстовым** (строка в UTF-8) или **бинарным** (произвольные байты). Объектов в протоколе нет.

```js
const s = new WebSocket('ws://localhost:5000/')
s.onopen = () => {
  s.send({ method: 'draw', x: 10 })                  // сервер получит: "[object Object]"
  s.send(JSON.stringify({ method: 'draw', x: 10 }))  // сервер получит: '{"method":"draw","x":10}'
  s.send(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))   // сервер получит: <Buffer 89 50 4e 47>
}
```

*Проверено* на сервере проекта с клиентом `WebSocket`, встроенным в Node 24.

**Почему объект не уходит как есть.** Объект — структура в памяти одного процесса, его свойства — ссылки на участки этой памяти. По сети можно передать только байты, поэтому объект сначала **сериализуют** (serialize): описывают строкой или байтами, по которым другая сторона соберёт копию. `send` понимает только строки и бинарные типы, а всё остальное приводит к строке через `String(obj)`. Для объекта получается `"[object Object]"`: данные теряются молча.

**JSON — договорённость о формате.** Отправитель вызывает `JSON.stringify`, получатель — `JSON.parse` и получает **копию**, а не тот же объект. Передать JSON умеет не всё:

```js
const msg = { at: new Date(0), cb: () => {}, nothing: undefined, tags: new Set(['a']) }
console.log(JSON.stringify(msg))
// {"at":"1970-01-01T00:00:00.000Z","tags":{}}
// Date стал строкой, функция и undefined пропали, Set — пустой объект
```

Экземпляр класса после `JSON.parse` становится обычным объектом без прототипа и методов. Поэтому по сети отправляют не инструмент `new Rect(...)`, а простое описание фигуры `{ type: 'rect', x, y, ... }`, а получатель рисует его своим кодом (глава 13).

**Файлы — бинарными кадрами.** Картинка, аудио, видео — уже байты, и их отправляют без перевода в текст:

| Где | Отправить | Получить |
|---|---|---|
| Браузер | `Blob` / `File`, `ArrayBuffer`, `Uint8Array` | `Blob` или `ArrayBuffer`, смотря по `socket.binaryType` |
| Node (`ws`) | `Buffer`, `ArrayBuffer`, `Uint8Array` | `Buffer` |

У бинарного кадра нет полей, поэтому описание файла (имя, тип) передают одним из способов:

- два сообщения подряд: JSON-описание, затем бинарный кадр (порядок внутри соединения сохраняется);
- заголовок в самих байтах: первые N байтов — длина и JSON, дальше файл;
- base64 внутри JSON: проще всего, но на треть тяжелее.

**Почему большие файлы обычно не передают через WebSocket.** Технически можно: `ws` по умолчанию принимает сообщения до 100 МБ (`maxPayload: 100 * 1024 * 1024` в `node_modules/ws/lib/websocket-server.js`). Но у соединения одна очередь: пока уходит видео на 50 МБ, все мелкие сообщения рисования стоят за ним. Поэтому роли разделяют:

- **файлы** загружают по HTTP: на сервер или в хранилище, с докачкой, прогрессом, кешем;
- **WebSocket** передаёт короткое событие со ссылкой: `{ method: 'file', url: '/files/cat.png' }`;
- **живые звук и видео** идут через **WebRTC**. Он передаёт медиапоток напрямую между браузерами и допускает потерю пакетов: пропущенный кадр лучше растущей задержки. WebSocket работает поверх TCP и всегда ждёт пропавшие данные.

> **Под капотом** — тип кадра записан в его первом байте, в опкоде (opcode) по RFC 6455. `0x1` — текст, `0x2` — бинарные данные. Служебные кадры: `0x8` — закрытие, `0x9`/`0xA` — ping/pong. Текстовый кадр обязан быть валидным UTF-8, иначе получатель по правилам протокола закрывает соединение. Поэтому произвольные байты нельзя положить в текстовый кадр «как строку»: нужен бинарный кадр или base64.

`express-ws` 5 использует `ws` 7, где текстовое сообщение приходит в обработчик строкой. В `ws` 8 оно приходит как `Buffer`. `JSON.parse` принимает и то и другое: аргумент сначала приводится к строке.

### 10.4. Протокол сообщений и маршрутизация

Смысл сообщений придумывает приложение. Здесь каждое сообщение — JSON с полем `method`, по которому сервер решает, что делать:

```js
// src/ws/index.js
import { connectionHandler } from './handlers/connection.js'
import { drawHandler } from './handlers/draw.js'

const parse = (raw) => {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export const registerWs = (app, wss) => {
  app.ws('/', (ws) => {
    ws.on('message', (raw) => {
      const msg = parse(raw)
      if (!msg) return

      switch (msg.method) {
        case 'connection':
          connectionHandler(ws, msg, wss)
          break
        case 'draw':
          drawHandler(ws, msg, wss)
          break
      }
    })
  })
}
```

Это простейший **маршрутизатор сообщений**: одно соединение — много типов событий. Неизвестный `method` не совпадает ни с одним `case` и молча игнорируется.

Наивный вариант разбора — `msg = JSON.parse(msg)` прямо в обработчике. Проблема: если клиент пришлёт не JSON, `JSON.parse` бросит исключение внутри обработчика `message`. Его никто не ловит, и **падает весь процесс Node** у всех участников всех сессий (*проверено*: `SyntaxError: Unexpected token 'o', "not json" is not valid JSON`, код выхода 1). Отправить такое может любой, кто откроет консоль браузера.

Рабочий вариант — функция `parse`, которая возвращает `null` вместо исключения. В обработчике остаётся одна проверка `if (!msg) return`. `catch` без параметра (optional catch binding) используют, когда сама ошибка не нужна.

> **Важно** — сервер не должен отправлять клиенту ничего, кроме JSON с полем `method`: ни строки-приветствия, ни отладочного текста. Клиент разбирает каждое входящее сообщение как JSON (глава 12). Договорённость о формате должна соблюдаться в обе стороны.

### 10.5. Параметры обработчиков: `ws`, `msg`, `wss`

У всех обработчиков одна сигнатура — кто прислал, что прислал и кому можно разослать:

| Параметр | Что это | Откуда | Сколько их |
|---|---|---|---|
| `ws` | соединение отправителя | аргумент колбэка `app.ws('/', (ws) => ...)`, вызывается на каждое подключение | по одному на вкладку |
| `msg` | разобранное сообщение `{ method, id, ... }` | `parse(raw)` в обработчике `message` | на каждое сообщение |
| `wss` | WebSocket-сервер, в `wss.clients` — все соединения | `expressWs(app).getWss()` в `createApp` | один на процесс |

- **`ws` — чтобы действовать от имени отправителя.** Само сообщение не содержит сведений о том, кто его прислал. Это знает только замыкание `ws.on('message')` внутри колбэка конкретного подключения. Через `ws` сервер помечает соединение id сессии, читает эту метку и исключает отправителя из рассылки (глава 13).
- **`wss` — чтобы добраться до остальных.** Соединение знает только себя, а список всех клиентов есть только у сервера. Каждый `client` в `wss.clients` — такой же объект соединения, как `ws`.

**Почему `wss` передаётся параметром, а не импортируется.** Наивный вариант — экспортировать сервер из `app.js` и импортировать в обработчиках. Это создаёт циклический импорт: `app.js` импортирует обработчики, а обработчики — `app.js`. Работать такой код будет лишь потому, что обработчики читают `wss` при вызове, когда все модули уже выполнены. Стоит обратиться к переменной на верхнем уровне модуля обработчика, и получится `ReferenceError`: `app.js` в этот момент ещё не дошёл до объявления. Кроме того, два экземпляра приложения (например, в тестах) делили бы один глобальный сервер. Передача через аргументы — внедрение зависимости (dependency injection) в самой простой форме.

> **На заметку** — когда типов сообщений становится много, `switch` заменяют таблицей обработчиков: `handlers[msg.method]?.(ws, msg, wss)`. Добавить тип сообщения — значит добавить строку в таблицу. Но таблицу нужно защитить от имён из прототипа (`handlers['toString']` существует у любого объекта), поэтому её создают через `Object.create(null)` или `Map`.

### 10.6. Проверка без клиента

- **Консоль браузера или Node 22+** — встроенный `WebSocket`:

  ```js
  const s = new WebSocket('ws://localhost:5000/')
  s.onmessage = (e) => console.log(e.data)
  s.onopen = () => s.send(JSON.stringify({ method: 'connection', id: 'test', username: 'A' }))
  // {"method":"connection","id":"test","username":"A"}
  ```

- **Postman**: New → WebSocket, адрес `ws://localhost:5000/`, кнопка Connect.

---

## Глава 11. Сессии: уникальные ссылки и маршрутизация

**Цель главы:** сделать так, чтобы каждая ссылка была отдельной комнатой для рисования.

### 11.1. Сессия живёт в адресе

Сессия — это комната: все, кто открыл одну ссылку, рисуют на одном холсте. Её идентификатор хранится в URL, поэтому «пригласить» — значит отправить ссылку.

```tsx
// App.tsx
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import styles from './App.module.scss'
import PaintPage from './pages/PaintPage/PaintPage.tsx'
import { generateId } from './utils/generateId.ts'

const App = () => {
  return (
    <BrowserRouter>
      <div className={styles.app}>
        <Routes>
          <Route path="/:id" element={<PaintPage />} />
          <Route path="*" element={<Navigate to={`/${generateId()}`} replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
```

Логика: если в адресе есть `/:id`, показать редактор, иначе перенаправить на новый id. Каждый, кто заходит на корень, получает свою новую сессию.

- **`replace`** заменяет запись в истории. Без него кнопка «назад» возвращала бы на `/`, откуда тут же снова срабатывало бы перенаправление.
- **Импорт из `react-router`.** С седьмой версии пакет `react-router-dom` объединён с `react-router`.

### 11.2. Почему перенаправление — это маршрут

В react-router 6 и новее нет отдельного компонента для перенаправления. `Routes` выбирает самый **конкретный** подходящий маршрут независимо от порядка детей, а детьми могут быть только `<Route>`. Поэтому перенаправление — обычный маршрут, который рендерит `<Navigate>`: при рендере тот сразу переходит на `to`.

Приоритет такой: статичный сегмент (`/about`) > параметр (`/:id`) > `*`. Маршрут `*` срабатывает, только когда больше ничего не подошло.

| Адрес | `/:id` | `*` | Результат |
|---|---|---|---|
| `/3b24...a962` | ✓ | ✓ | `PaintPage`: `/:id` конкретнее |
| `/` | ✗ (нужен непустой сегмент) | ✓ | перенаправление на новую сессию |
| `/a/b` | ✗ (`:id` — ровно один сегмент) | ✓ | перенаправление на новую сессию |

Почему `path="*"`, а не `path="/"`: с `/` адрес вроде `/a/b` не совпал бы ни с одним маршрутом и показал бы пустую страницу.

> **На заметку** — в react-router есть и функция `redirect()`, но она для режима data router (`createBrowserRouter`), где её возвращают из `loader`/`action` до рендера страницы. С `<BrowserRouter>` и `<Routes>` перенаправляют только через `<Navigate>`.

### 11.3. Генерация id

Наивный вариант — текущее время в шестнадцатеричной записи:

```js
const id = `f${(+new Date).toString(16)}`
console.log(id) // например f19a0d5e3c21 — миллисекунды в hex
```

Проблемы у него две:

- два человека, открывших корень в одну и ту же миллисекунду, попадут в одну сессию;
- id легко угадать: перебор соседних миллисекунд находит чужие сессии.

Рабочий вариант — `crypto.randomUUID()`: 122 случайных бита, совпадение практически исключено, угадать нельзя. Но и у него есть ограничение.

```ts
// utils/generateId.ts
// crypto.randomUUID есть только в безопасном контексте (https или localhost).
// По адресу в локальной сети (http://192.168...) берём случайные байты напрямую.
export const generateId = () => {
  if (window.isSecureContext) return crypto.randomUUID()

  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}
```

`crypto.randomUUID` доступен только в **безопасном контексте** (secure context): `https://` или `localhost`. Совместное рисование естественно проверять с двух устройств в одной сети: клиент запускается через `npm run dev -- --host`, а телефон открывает `http://192.168.x.x:5173`. Это небезопасный контекст, и вызов падает с `TypeError: crypto.randomUUID is not a function`.

`crypto.getRandomValues` доступен в любом контексте и даёт те же криптостойкие случайные байты. 16 байт = 128 бит, в hex это 32 символа: такой же неугадываемый id, только без дефисов. `padStart(2, '0')` нужен, чтобы байт `5` стал `'05'`, а не `'5'`, иначе id получились бы разной длины.

> **Важно** — неугадываемый id в ссылке — это вся «защита доступа» в приложении: кто знает ссылку, тот участник. Так же устроены ссылки «доступ всем, у кого есть ссылка» в сервисах совместной работы. Поэтому качество генератора здесь так же важно, как у пароля.

### 11.4. Страница редактора

```tsx
// pages/PaintPage/PaintPage.tsx — итоговая версия
import { observer } from 'mobx-react-lite'
import { useParams } from 'react-router'
import Canvas from '../../components/Canvas/Canvas.tsx'
import SettingBar from '../../components/SettingBar/SettingBar.tsx'
import Toolbar from '../../components/Toolbar/Toolbar.tsx'
import UsernameModal from '../../components/UsernameModal/UsernameModal.tsx'
import { useSessionSocket } from '../../hooks/useSessionSocket.ts'
import canvasState from '../../store/canvasState.ts'

const PaintPage = observer(() => {
  const { id } = useParams<{ id: string }>()
  useSessionSocket(id, canvasState.username)

  return (
    <>
      {!canvasState.username && (
        <UsernameModal onSubmit={(username) => canvasState.setUsername(username)} />
      )}
      <Toolbar />
      <SettingBar />
      <Canvas />
    </>
  )
})

export default PaintPage
```

Экран вынесен в компонент-**страницу**, а не перечислен прямо внутри `<Route>`:

- `App` описывает только карту маршрутов, по одной строке на адрес;
- страница (`pages/`) привязана к адресу и собирает экран из **компонентов** (`components/`), а компоненты о маршрутах не знают и могут переиспользоваться;
- у экрана есть место для общей логики сессии: окно ввода имени и подключение к серверу (глава 12).

Фрагмент `<>...</>`, а не `<div>`: лишняя обёртка не нужна, панели и холст позиционируются относительно `.app`.

**id сессии в сторе.** `Canvas` кладёт id из адреса в `canvasState`, потому что он нужен инструментам и кнопке «Сохранить»:

```tsx
// components/Canvas/Canvas.tsx
const { id } = useParams<{ id: string }>()

useEffect(() => {
  if (id) canvasState.setSessionId(id)
}, [id])
```

```ts
// store/canvasState.ts
sessionId: string | null = null

setSessionId(id: string) {
  this.sessionId = id
}
```

`useParams<{ id: string }>()` описывает параметры маршрута, но тип поля всё равно `string | undefined`: компонент можно отрендерить и вне маршрута с `:id`. Отсюда `if (id)`.

**Сервер статики должен отдавать `index.html` на любой путь.** Ссылку на сессию открывают напрямую, и сервер обязан вернуть приложение, а не 404. Dev-сервер Vite и `vite preview` делают это сами (*проверено*: код 200 на `/<id>`). Боевому серверу статики (nginx и подобным) это настраивают отдельно правилом «на любой путь отдавать `index.html`».

> **Внимание** — при переходе с `/a` на `/b` в той же вкладке React Router **не** пересоздаёт `PaintPage` и `Canvas`: маршрут тот же (`/:id`), меняется только параметр. Холст и история undo/redo останутся от сессии `a`. Если такой переход нужен, компонент пересоздают принудительно ключом: `<Canvas key={id} />` в `PaintPage`.

---

## Глава 12. Вход в сессию: модальное окно и подключение

**Цель главы:** спросить имя, открыть WebSocket и правильно закрыть его при уходе.

### 12.1. Модальное окно на `<dialog>`

```tsx
// components/UsernameModal/UsernameModal.tsx
import { useEffect, useRef, type FormEvent } from 'react'
import styles from './UsernameModal.module.scss'

type Props = {
  onSubmit: (username: string) => void
}

const UsernameModal = ({ onSubmit }: Props) => {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    dialog?.showModal()
    return () => dialog?.close()
  }, [])

  const submitHandler = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const username = inputRef.current?.value.trim()
    if (username) onSubmit(username)
  }

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      closedby="none"
      onCancel={(e) => e.preventDefault()}
    >
      <form className={styles.form} onSubmit={submitHandler}>
        <h3 className={styles.title}>Введите ваше имя</h3>
        <input ref={inputRef} className={styles.input} type="text" required autoFocus />
        <button className={styles.button} type="submit">
          Войти
        </button>
      </form>
    </dialog>
  )
}

export default UsernameModal
```

```scss
// components/UsernameModal/UsernameModal.module.scss (фрагмент)
.dialog {
  margin: auto;
  border: none;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);

  &::backdrop {
    background-color: rgba(0, 0, 0, 0.5);
  }
}
```

**Почему `<dialog>`, а не UI-библиотека.** Вызов `showModal()` даёт всё, ради чего обычно подключают компонент модального окна:

- окно в верхнем слое (top layer) — поверх всего, без `z-index` и порталов;
- остальная страница **инертна** (inert): клики и Tab до неё не доходят;
- фокус переносится внутрь окна;
- фон затемняется через псевдоэлемент `::backdrop`.

**`showModal()`, а не атрибут `open`.** `<dialog open>` показывает окно как обычный блок на странице: без верхнего слоя, затемнения и блокировки фона. Модальным окно делает только вызов метода, поэтому показ — в `useEffect`, когда элемент уже в DOM.

**Кто решает, показывать ли окно.** Модалка видна, пока `canvasState.username` пустой. После отправки стор получает имя, `PaintPage` (она обёрнута в `observer`) перерисовывается, и модалка **размонтируется**, а функция очистки закрывает `<dialog>`. Отдельный флаг видимости в `useState` не нужен: состояние «имя введено» уже есть в сторе, и второй флаг мог бы с ним разойтись.

**Окно нельзя закрыть без имени.** Для этого работают две защиты:

- `closedby="none"` запрещает закрывать окно действием пользователя: Esc, жестом «назад» на Android, кликом по фону;
- `onCancel` с `preventDefault` — запасной вариант для браузеров без `closedby`: Esc вызывает событие `cancel`, и его отмена оставляет окно открытым.

Нужны обе. Chrome защищается от окон, которые невозможно закрыть, и даёт отменить `cancel` только после того, как пользователь уже взаимодействовал со страницей. Это окно открывается сразу при загрузке, до любых действий, поэтому без `closedby` Esc мог бы закрыть его вопреки `preventDefault`. Тип атрибута есть в `@types/react` 19: `closedby?: "any" | "closerequest" | "none"`.

**Форма вместо кнопки с `onClick`:**

- Enter в поле отправляет форму;
- `required` не даёт отправить пустое поле;
- `e.preventDefault()` отменяет настоящую отправку формы, то есть перезагрузку страницы.

`trim()` отсекает имя из одних пробелов, которое `required` пропустил бы. Поле неуправляемое: значение нужно один раз, в момент отправки, поэтому оно читается через `ref`.

**`type FormEvent`** — импорт типа прямо в списке значений (inline type import), этого требует `verbatimModuleSyntax`.

> **Внимание** — сброс стилей `* { margin: 0 }` из `global.scss` обнуляет `margin: auto`, которым браузер **центрирует** `<dialog>`, и окно прилипает к левому верхнему углу. Поэтому в `.dialog` центрирование возвращено явно: `margin: auto`.

### 12.2. Адреса сервера

```ts
// config.ts
// hostname страницы, а не localhost: с другого устройства в сети localhost — это само устройство
const SERVER_HOST = `${location.hostname}:5000`

export const API_URL = `http://${SERVER_HOST}`
export const WS_URL = `ws://${SERVER_HOST}/`
```

Если клиент открыт с телефона по адресу `http://192.168.1.10:5173`, сервер нужно искать на `192.168.1.10`, а не на `localhost`: для телефона `localhost` — это сам телефон. Подставляется хост, с которого загружена страница, поэтому при локальной разработке получается тот же `ws://localhost:5000/`.

### 12.3. Протокол на клиенте

```ts
// ws/messages.ts (сообщения; типы фигур — в главе 13)
export type ConnectionMessage = {
  method: 'connection'
  id: string
  username: string
}

export type DrawMessage = {
  method: 'draw'
  id: string
  figure: Figure
}

export type Message = ConnectionMessage | DrawMessage
```

```ts
// ws/socket.ts
import type { Message } from './messages.ts'

export const sendMessage = (socket: WebSocket, msg: Message) => {
  socket.send(JSON.stringify(msg))
}

export const parseMessage = (data: unknown): Message | null => {
  if (typeof data !== 'string') return null
  try {
    return JSON.parse(data) as Message
  } catch {
    return null
  }
}
```

- **`sendMessage` — единственное место, где вызывается `JSON.stringify`.** TypeScript проверяет каждое сообщение по типу: опечатка `methd` или забытый `username` — ошибка компиляции, а объект без сериализации в сокет уже не попадёт.
- **`parseMessage(data: unknown)` — граница доверия.** Данные пришли по сети, и тип `MessageEvent.data` — `any`. Тип `unknown` заставляет проверить, что это строка (бинарный кадр пришёл бы как `Blob`), а `try/catch` защищает от некорректного JSON.
- **`as Message` — утверждение типа, а не проверка.** TypeScript верит, что сервер прислал корректное сообщение. Полную проверку структуры делают валидаторы вроде zod, для учебного проекта это лишнее.
- **`Message` — дискриминированное объединение** (discriminated union) по полю `method`. Внутри `case 'connection'` TypeScript знает, что `msg` — `ConnectionMessage`, и `msg.username` доступен без проверок.

### 12.4. Хук подключения

```ts
// hooks/useSessionSocket.ts
import { useEffect } from 'react'
import canvasState from '../store/canvasState.ts'
import { drawFigure } from '../tools/drawFigure.ts'
import { WS_URL } from '../config.ts'
import { parseMessage, sendMessage } from '../ws/socket.ts'

export const useSessionSocket = (sessionId: string | undefined, username: string) => {
  useEffect(() => {
    if (!sessionId || !username) return

    const socket = new WebSocket(WS_URL)
    canvasState.setSocket(socket)

    socket.onopen = () => {
      console.log('Подключение установлено')
      sendMessage(socket, { method: 'connection', id: sessionId, username })
    }

    socket.onmessage = (event) => {
      const msg = parseMessage(event.data)
      if (!msg) return

      switch (msg.method) {
        case 'connection':
          console.log(`Пользователь ${msg.username} присоединился`)
          break
        case 'draw': {
          const ctx = canvasState.ctx
          if (ctx) drawFigure(ctx, msg.figure)
          break
        }
      }
    }

    socket.onclose = () => console.log('Соединение закрыто')

    return () => {
      socket.close()
      canvasState.setSocket(null)
    }
  }, [sessionId, username])
}
```

```ts
// store/canvasState.ts
username = ''
socket: WebSocket | null = null

setUsername(username: string) {
  this.username = username
}

setSocket(socket: WebSocket | null) {
  this.socket = socket
}
```

- **Сокет открывается, когда есть и сессия, и имя.** `PaintPage` — `observer` и читает `canvasState.username` при рендере. Пользователь ввёл имя → перерендер → новое значение попадает в зависимости эффекта → сокет открывается. Внутри самого эффекта чтение стора не отслеживается: эффект перезапускает только массив зависимостей.
- **Отправка — в `onopen`.** `new WebSocket()` только начинает рукопожатие. Пока соединение в состоянии `CONNECTING`, `send()` бросает исключение:

  ```js
  const s = new WebSocket('ws://localhost:5000/')
  console.log(s.readyState)                                  // 0 — CONNECTING
  try { s.send('x') } catch (e) { console.log(e.name) }      // InvalidStateError
  s.onopen = () => console.log(s.readyState)                 // 1 — OPEN
  ```

- **Функция очистки** закрывает сокет и убирает его из стора: при уходе со страницы, при смене сессии или имени. Старый сокет закрывается до того, как откроется новый. Без очистки каждое переподключение оставляло бы висеть прежнее соединение, и сообщения приходили бы по нескольку раз.
- **Сокет хранится в сторе**, потому что инструментам нужно отправлять через него действия (глава 13).
- **Фигурные скобки у `case 'draw': { ... }`** создают блок для `const ctx`. Без них объявление попало бы в общую область видимости всего `switch`.

> **Внимание** — в режиме разработки `StrictMode` выполняет эффект дважды: открыть сокет → очистка закрывает его → открыть снова. Первый сокет закрывается ещё в состоянии `CONNECTING`, и браузер пишет в консоль `WebSocket is closed before the connection is established`. Это ожидаемо и бывает только в dev-режиме. На сервере видно короткое лишнее подключение, а в production-сборке эффект выполняется один раз.

### 12.5. Сервер: вход в сессию

```js
// src/ws/handlers/connection.js
import { broadcast } from '../broadcast.js'

export const connectionHandler = (ws, msg, wss) => {
  ws.id = msg.id
  broadcast(wss, msg)
}
```

```js
// src/ws/broadcast.js
export const broadcast = (wss, msg, except = null) => {
  wss.clients.forEach((client) => {
    if (client !== except && client.id === msg.id) {
      client.send(JSON.stringify(msg))
    }
  })
}
```

Комнат в пакете `ws` нет, поэтому они сделаны вручную: id сессии записывается прямо на объект соединения (`ws.id`), а при рассылке клиенты фильтруются по нему. Параметр `except` позволяет исключить отправителя, но `connection` рассылается всем, включая его: эхо подтверждает вход.

Кто что получает (*проверено*, три клиента: A и B в сессии `s1`, C в `s2`):

```
A <- connection A       ← отправитель получает своё же сообщение
A <- connection B       ← A уже в сессии и узнаёт о B
B <- connection B       ← B не узнаёт, что A был там раньше
C <- connection C       ← другая сессия изолирована
```

Вошедший узнаёт только о себе: списка уже присутствующих сервер не хранит.

> **На заметку** — перебор всех клиентов при каждой рассылке стоит O(число всех соединений на сервере), а не O(участников сессии). Для небольшого приложения это неважно. Обычная структура для комнат — `Map<sessionId, Set<ws>>`: соединение добавляется в `connection`, удаляется в `ws.on('close')`, а рассылка идёт только по нужному `Set`. Именно это Socket.IO называет комнатами (rooms).

### 12.6. Жизненный цикл соединения

Текущая реализация подключается и корректно закрывает соединение, но не восстанавливает его:

- **Разрыв соединения.** Если сервер перезапустился (`node --watch` делает это при каждом сохранении файла) или пропала сеть, `onclose` только пишет в консоль, а синхронизация молча прекращается. Следующий шаг — переподключение с нарастающей задержкой (1 с, 2 с, 4 с...) и повторная отправка `connection`.
- **Мёртвые соединения.** Если клиент пропал без закрытия (сон ноутбука, обрыв Wi-Fi), сервер долго считает его подключённым. Стандартное решение — сервер периодически шлёт `ping`, и если `pong` не пришёл, вызывает `ws.terminate()`.

---

## Глава 13. Совместное рисование

**Цель главы:** научить инструменты отправлять свои действия, а клиентов — рисовать чужие.

### 13.1. События или состояние

Синхронизировать холст можно двумя способами:

- **пересылка событий**: по сети идут действия («отрезок из A в B»), и каждый клиент повторяет их у себя. Трафика мало, но все клиенты должны начинать с одинакового холста и получать все события в одном порядке;
- **пересылка состояния**: по сети идёт картинка целиком. Это надёжно, но тяжело: десятки килобайт на каждое движение мыши.

Здесь используются события. Порядок обеспечивает транспорт: WebSocket работает поверх TCP, поэтому сообщения одного соединения приходят **в том порядке, в котором отправлены**, и без потерь. Сервер на Node обрабатывает сообщения в одном потоке и рассылает их всем в одинаковом порядке. Опоздавший участник видит только то, что нарисовали после его входа, и эту дыру закрывает снимок холста по HTTP (глава 14).

### 13.2. Наивный вариант и его проблемы

Первое решение, которое приходит в голову: кисть на каждом движении мыши отправляет точку, на отпускание — «конец штриха», сервер рассылает это всем участникам сессии, **включая отправителя**, и каждый, включая самого рисующего, рисует пришедшее.

```js
// кисть
mouseMoveHandler(e) {
  if (this.mouseDown) {
    this.socket.send(JSON.stringify({ method: 'draw', id: this.id,
      figure: { type: 'brush', x: e.offsetX, y: e.offsetY } }))
  }
}
mouseUpHandler() {
  this.mouseDown = false
  this.socket.send(JSON.stringify({ method: 'draw', id: this.id, figure: { type: 'finish' } }))
}

// получатель
switch (figure.type) {
  case 'brush':  ctx.lineTo(figure.x, figure.y); ctx.stroke(); break
  case 'finish': ctx.beginPath(); break
}
```

Схема работает на одном компьютере с одним участником, но ломается сразу в пяти местах:

1. **Задержка у самого рисующего.** Свой штрих появляется только после пути «клиент → сервер → клиент». На localhost этого не видно, а на сервере с пингом 100 мс линия тянется за курсором. Рисовать локально и при этом получать эхо тоже нельзя: каждая точка нарисуется дважды.
2. **Склеивание одновременных штрихов.** У каждого клиента **один** текущий путь в контексте. Если A и B ведут кисть одновременно, их точки приходят вперемешку, и `lineTo` соединяет их в одну зигзагообразную линию.
3. **Чужой цвет и толщина.** Сообщение несёт только `x` и `y`, поэтому получатель рисует **своим** текущим `strokeStyle`: A рисует красным, B видит линию своим синим.
4. **Чужая фигура меняет ваши настройки.** Если получатель ставит `ctx.fillStyle = figure.color` и не возвращает старое значение, следующая ваша фигура зальётся чужим цветом. Это ловушка общего состояния контекста (раздел 5.2).
5. **Доверие к `id` из сообщения.** Если сервер рассылает по `msg.id`, клиент может прислать сообщение с id любой сессии и рисовать в ней, не подключаясь.

Есть и шестая проблема, архитектурная: если инструмент получает сокет в конструкторе (`new Brush(canvas, socket, id)`), его приходится пересоздавать после открытия соединения. А инструмент, который создали без сокета (например, ластик по кнопке), упадёт на первом же `this.socket.send` с `TypeError: Cannot read properties of undefined (reading 'send')`.

### 13.3. Рабочий вариант: что меняется

| | Наивный вариант | Рабочий вариант |
|---|---|---|
| Что отправляется | точка `{ x, y }` + `finish` | отрезок `{ x0, y0, x1, y1, width, color }` |
| Свой штрих | рисуется после эха | рисуется сразу, сервер не возвращает его отправителю |
| Цвет и толщина | берутся у получателя | приходят в сообщении |
| Одновременные штрихи | склеиваются в общем пути | не мешают: каждый отрезок рисуется своим путём |
| Состояние контекста | меняется чужой фигурой | защищено `save()` / `restore()` |
| Сессия рассылки | `msg.id` из сообщения | `ws.id`, установленный при `connection` |
| Сокет у инструмента | передаётся в конструктор | берётся из стора в момент отправки |

### 13.4. Протокол фигур

```ts
// ws/messages.ts
export type Segment = {
  x0: number
  y0: number
  x1: number
  y1: number
  width: number
}

export type BrushFigure = Segment & {
  type: 'brush'
  color: string
}

export type EraserFigure = Segment & {
  type: 'eraser'
}

export type RectFigure = {
  type: 'rect'
  x: number
  y: number
  width: number
  height: number
  fillColor: string
  strokeColor: string
  lineWidth: number
}

export type CircleFigure = {
  type: 'circle'
  x: number
  y: number
  r: number
  fillColor: string
  strokeColor: string
  lineWidth: number
}

export type LineFigure = {
  type: 'line'
  x0: number
  y0: number
  x1: number
  y1: number
  strokeColor: string
  lineWidth: number
}

export type Figure = BrushFigure | EraserFigure | RectFigure | CircleFigure | LineFigure
```

- **Каждая фигура самодостаточна.** В ней есть всё, что нужно для отрисовки, и она не зависит ни от состояния пути, ни от настроек получателя.
- **`Segment & { type: 'brush' }`** — пересечение типов (intersection): объект должен иметь поля обоих. Общие поля отрезка описаны один раз.
- **Состав полей повторяет отрисовку.** У ластика нет цвета, ведь при стирании он не важен. У линии нет заливки. Круг передаётся центром и готовым радиусом, чтобы получатель не повторял расчёт.
- **`type`** — поле-дискриминант: по нему TypeScript сужает `Figure` до конкретного варианта.

### 13.5. Отправка в базовом классе

```ts
// tools/Tool.ts — итоговая версия
import canvasState from '../store/canvasState.ts'
import type { Figure } from '../ws/messages.ts'
import { sendMessage } from '../ws/socket.ts'

export default class Tool {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('2D context is not supported')

    this.canvas = canvas
    this.ctx = ctx
    this.destroyEvents()
  }

  set fillColor(color: string) {
    this.ctx.fillStyle = color
  }

  set strokeColor(color: string) {
    this.ctx.strokeStyle = color
  }

  set lineWidth(width: number) {
    this.ctx.lineWidth = width
  }

  destroyEvents() {
    this.canvas.onmousemove = null
    this.canvas.onmousedown = null
    this.canvas.onmouseup = null
  }

  protected sendFigure(figure: Figure) {
    const { socket, sessionId } = canvasState
    if (socket?.readyState !== WebSocket.OPEN || !sessionId) return
    sendMessage(socket, { method: 'draw', id: sessionId, figure })
  }
}
```

Инструмент берёт сокет из стора **в момент отправки**. Кисть, созданная до ввода имени, начнёт синхронизироваться, как только соединение откроется, и пересоздавать её не нужно. Если соединения нет или оно ещё не открыто, рисование остаётся локальным, а `send` не бросает `InvalidStateError`.

`protected` — метод доступен наследникам, но не внешнему коду: вызов `toolState.tool.sendFigure(...)` из компонента — ошибка компиляции. Модификатор существует только для типов и стирается при сборке, поэтому совместим с `erasableSyntaxOnly`.

### 13.6. Кисть и ластик: отрезки

```ts
// tools/Brush.ts — итоговая версия
import type { BrushFigure, Figure } from '../ws/messages.ts'
import Tool from './Tool.ts'

export default class Brush extends Tool {
  mouseDown = false
  lastX = 0
  lastY = 0

  constructor(canvas: HTMLCanvasElement) {
    super(canvas)
    this.listen()
  }

  listen() {
    this.canvas.onmousemove = this.mouseMoveHandler.bind(this)
    this.canvas.onmousedown = this.mouseDownHandler.bind(this)
    this.canvas.onmouseup = this.mouseUpHandler.bind(this)
  }

  mouseUpHandler() {
    this.mouseDown = false
  }

  mouseDownHandler(e: MouseEvent) {
    this.mouseDown = true
    this.lastX = e.offsetX
    this.lastY = e.offsetY
  }

  mouseMoveHandler(e: MouseEvent) {
    if (!this.mouseDown) return

    const figure = this.createFigure(e.offsetX, e.offsetY)
    this.drawFigure(figure)
    this.sendFigure(figure)

    this.lastX = e.offsetX
    this.lastY = e.offsetY
  }

  createFigure(x: number, y: number): Figure {
    return {
      type: 'brush',
      x0: this.lastX,
      y0: this.lastY,
      x1: x,
      y1: y,
      width: this.ctx.lineWidth,
      color: String(this.ctx.strokeStyle),
    }
  }

  drawFigure(figure: Figure) {
    if (figure.type === 'brush') Brush.draw(this.ctx, figure)
  }

  static draw(ctx: CanvasRenderingContext2D, figure: BrushFigure) {
    ctx.save()
    ctx.strokeStyle = figure.color
    ctx.lineWidth = figure.width
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(figure.x0, figure.y0)
    ctx.lineTo(figure.x1, figure.y1)
    ctx.stroke()
    ctx.restore()
  }
}
```

- **Одна функция отрисовки для своих и чужих штрихов.** Локально кисть рисует через тот же `Brush.draw`, которым получатель рисует пришедшее сообщение. Картинка у всех участников совпадает по построению.
- **`lastX` / `lastY` вместо общего пути.** Кисть помнит предыдущую точку и на каждом движении создаёт отрезок «предыдущая → текущая». Путь живёт ровно один вызов `draw`, поэтому чужие отрезки, пришедшие посреди вашего штриха, ничего не ломают.
- **Порядок в `mouseMoveHandler`:** создать фигуру → нарисовать у себя → отправить. Пользователь видит штрих сразу, без ожидания сети.
- **`save()` / `restore()`** — отрисовка чужого красного отрезка не меняет ваш синий `strokeStyle`.
- **`lineCap = 'round'`.** Штрих состоит из отдельных отрезков. С плоскими концами (`butt`, по умолчанию) на изгибах толстой линии видны зазубрины, а круглые концы перекрываются и дают гладкую линию. У сплошного пути стыки сглаживало соединение линий (`lineJoin`), но здесь каждый отрезок — свой путь.
- **`String(this.ctx.strokeStyle)`.** Тип свойства — `string | CanvasGradient | CanvasPattern`. Градиенты в проекте не используются, а для JSON нужна строка.
- **Сигнал «конец штриха» не нужен.** Он сбрасывал общий путь у получателей, а общего пути больше нет.

```ts
// tools/Eraser.ts — итоговая версия
import type { EraserFigure, Figure } from '../ws/messages.ts'
import Brush from './Brush.ts'

export default class Eraser extends Brush {
  override createFigure(x: number, y: number): Figure {
    return {
      type: 'eraser',
      x0: this.lastX,
      y0: this.lastY,
      x1: x,
      y1: y,
      width: this.ctx.lineWidth,
    }
  }

  override drawFigure(figure: Figure) {
    if (figure.type === 'eraser') Eraser.erase(this.ctx, figure)
  }

  static erase(ctx: CanvasRenderingContext2D, figure: EraserFigure) {
    ctx.save()
    ctx.globalCompositeOperation = 'destination-out'
    ctx.lineWidth = figure.width
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(figure.x0, figure.y0)
    ctx.lineTo(figure.x1, figure.y1)
    ctx.stroke()
    ctx.restore()
  }
}
```

Ластик наследует обработчики мыши и переопределяет только создание и отрисовку фигуры. Его штрихи уходят по сети с типом `eraser`, и у получателя они стирают, а не рисуют краской.

> **Внимание** — статический метод ластика назван `erase`, а не `draw`. TypeScript проверяет совместимость и **статической** стороны класса: `Eraser.draw(ctx, EraserFigure)` несовместим с унаследованным `Brush.draw(ctx, BrushFigure)`, и `class Eraser extends Brush` перестал бы компилироваться.

### 13.7. Фигуры: отправка на отпускание мыши

Промежуточные кадры предпросмотра другим участникам не нужны. Фигура собирается на каждом `mousemove`, а по сети уходит один раз, на `mouseup`, уже готовой.

```ts
// tools/Rect.ts — итоговая версия
import type { RectFigure } from '../ws/messages.ts'
import Tool from './Tool.ts'

export default class Rect extends Tool {
  mouseDown = false
  startX = 0
  startY = 0
  saved: ImageData | null = null
  figure: RectFigure | null = null

  constructor(canvas: HTMLCanvasElement) {
    super(canvas)
    this.listen()
  }

  listen() {
    this.canvas.onmousemove = this.mouseMoveHandler.bind(this)
    this.canvas.onmousedown = this.mouseDownHandler.bind(this)
    this.canvas.onmouseup = this.mouseUpHandler.bind(this)
  }

  mouseUpHandler() {
    this.mouseDown = false
    if (this.figure) this.sendFigure(this.figure)
    this.figure = null
  }

  mouseDownHandler(e: MouseEvent) {
    this.mouseDown = true
    this.startX = e.offsetX
    this.startY = e.offsetY
    this.saved = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)
  }

  mouseMoveHandler(e: MouseEvent) {
    if (!this.mouseDown) return

    this.figure = {
      type: 'rect',
      x: this.startX,
      y: this.startY,
      width: e.offsetX - this.startX,
      height: e.offsetY - this.startY,
      fillColor: String(this.ctx.fillStyle),
      strokeColor: String(this.ctx.strokeStyle),
      lineWidth: this.ctx.lineWidth,
    }

    if (this.saved) this.ctx.putImageData(this.saved, 0, 0)
    Rect.draw(this.ctx, this.figure)
  }

  static draw(ctx: CanvasRenderingContext2D, figure: RectFigure) {
    ctx.save()
    ctx.fillStyle = figure.fillColor
    ctx.strokeStyle = figure.strokeColor
    ctx.lineWidth = figure.lineWidth
    ctx.beginPath()
    ctx.rect(figure.x, figure.y, figure.width, figure.height)
    ctx.fill()
    ctx.stroke()
    ctx.restore()
  }
}
```

- **Последняя собранная фигура и есть финальная**: координаты отпускания совпадают с последним движением мыши.
- **Клик без протягивания ничего не отправляет**: `mousemove` не случился, `figure` осталось `null`. Если хранить ширину и высоту в отдельных полях без начальных значений, по сети ушёл бы прямоугольник с `NaN`-размерами.
- **`this.figure = null` после отправки** — чтобы следующее нажатие без движения мыши не отправило старый прямоугольник.
- **Предпросмотр рисуется той же функцией `Rect.draw`**, что и чужой прямоугольник. Экземплярный метод `draw` из главы 6 больше не нужен.

Круг и линия устроены так же. Отличаются сборка фигуры и функция отрисовки:

```ts
// tools/Circle.ts — отличия от Rect.ts
this.figure = {
  type: 'circle',
  x: this.startX,
  y: this.startY,
  r: Math.hypot(e.offsetX - this.startX, e.offsetY - this.startY),
  fillColor: String(this.ctx.fillStyle),
  strokeColor: String(this.ctx.strokeStyle),
  lineWidth: this.ctx.lineWidth,
}

static draw(ctx: CanvasRenderingContext2D, figure: CircleFigure) {
  ctx.save()
  ctx.fillStyle = figure.fillColor
  ctx.strokeStyle = figure.strokeColor
  ctx.lineWidth = figure.lineWidth
  ctx.beginPath()
  ctx.arc(figure.x, figure.y, figure.r, 0, 2 * Math.PI)
  ctx.fill()
  ctx.stroke()
  ctx.restore()
}
```

```ts
// tools/Line.ts — отличия от Rect.ts
this.figure = {
  type: 'line',
  x0: this.startX,
  y0: this.startY,
  x1: e.offsetX,
  y1: e.offsetY,
  strokeColor: String(this.ctx.strokeStyle),
  lineWidth: this.ctx.lineWidth,
}

static draw(ctx: CanvasRenderingContext2D, figure: LineFigure) {
  ctx.save()
  ctx.strokeStyle = figure.strokeColor
  ctx.lineWidth = figure.lineWidth
  ctx.beginPath()
  ctx.moveTo(figure.x0, figure.y0)
  ctx.lineTo(figure.x1, figure.y1)
  ctx.stroke()
  ctx.restore()
}
```

### 13.8. Приём: одна точка, знающая все фигуры

```ts
// tools/drawFigure.ts
import type { Figure } from '../ws/messages.ts'
import Brush from './Brush.ts'
import Circle from './Circle.ts'
import Eraser from './Eraser.ts'
import Line from './Line.ts'
import Rect from './Rect.ts'

export const drawFigure = (ctx: CanvasRenderingContext2D, figure: Figure) => {
  switch (figure.type) {
    case 'brush':
      Brush.draw(ctx, figure)
      break
    case 'eraser':
      Eraser.erase(ctx, figure)
      break
    case 'rect':
      Rect.draw(ctx, figure)
      break
    case 'circle':
      Circle.draw(ctx, figure)
      break
    case 'line':
      Line.draw(ctx, figure)
      break
  }
}
```

Хук подключения (раздел 12.4) на сообщение `draw` вызывает `drawFigure(ctx, msg.figure)`. Внутри каждого `case` TypeScript сужает `figure` до нужного варианта, поэтому `Rect.draw(ctx, figure)` получает именно `RectFigure`.

> **На заметку** — если добавить в `Figure` новый тип и забыть про `case`, фигура молча не нарисуется: компилятор этого не заметит. Проверка полноты (exhaustiveness check) превращает такой пропуск в ошибку компиляции: `default: figure satisfies never`. В ветке `default` у `figure` тип `never` только тогда, когда все варианты обработаны. Иначе `satisfies never` не компилируется (*проверено*: `error TS1360: Type '{ type: "b"; }' does not satisfy the expected type 'never'`). Вариант `const unreachable: never = figure` с `noUnusedLocals` даёт ошибку о неиспользуемой переменной.

### 13.9. Сервер: рассылка рисования

```js
// src/ws/handlers/draw.js
import { broadcast } from '../broadcast.js'

export const drawHandler = (ws, msg, wss) => {
  // сессия берётся из соединения, а не из сообщения: рисовать можно только там, куда подключился
  if (!ws.id) return
  broadcast(wss, { ...msg, id: ws.id }, ws)
}
```

- **`draw` уходит всем участникам сессии, кроме отправителя**: тот уже нарисовал фигуру сам.
- **Сессия берётся из `ws.id`**, который установил `connection`, а не из сообщения. Клиент без `connection` рисовать не может, а подменённый `id` в сообщении ни на что не влияет.
- **Сервер в фигуру не заглядывает.** Новый тип фигуры — изменение протокола только на клиенте: тип в `Figure`, отрисовка в `drawFigure` и отправка в инструменте.

Проверено (*проверено*, A и B в `s1`, C в `s2`, D без `connection`):

```
A: draw { id: 's1', color: '#ff0000' }       → получил только B
A: draw { id: 's2', color: 'подмена id' }    → получил B (сессия A — s1), C не получил
D: draw { id: 's1' }                         → не получил никто
```

### 13.10. Что остаётся нерешённым

> **Внимание** — чужие штрихи рисуются прямо на холсте, поэтому попадают в ваши снимки:
>
> - **Предпросмотр фигур.** Пока вы тянете прямоугольник, каждое движение мыши восстанавливает снимок, сделанный на `mousedown`, и стирает всё, что пришло от других участников после него.
> - **Undo.** История — снимки всего холста, поэтому отмена откатывает и чужие штрихи, нарисованные после вашего действия, причём только у вас.
>
> Полноценное решение — хранить рисунок как список действий (раздел 8.1, «Команды») и перерисовывать холст из него, а предпросмотр рисовать на отдельном слое.

**Частота сообщений.** `mousemove` срабатывает с частотой обновления экрана и даже чаще, и каждое событие кисти — отдельное сообщение. При нескольких участниках это сотни сообщений в секунду. Обычные приёмы — копить отрезки и отправлять пачкой раз в кадр (`requestAnimationFrame`) или раз в 16–30 мс.

**Повтор кода.** `Rect`, `Circle` и `Line` различаются только сборкой фигуры и функцией `draw`: поля, `listen`, `mouseDownHandler` и `mouseUpHandler` у них совпадают построчно. Это повод выделить общий базовый класс фигуры, например `ShapeTool` с абстрактными `createFigure(e)` и `drawFigure(figure)`.

---

## Глава 14. Хранение рисунка: снимок холста по HTTP

**Цель главы:** сделать так, чтобы вошедший в сессию позже и пользователь после перезагрузки страницы видели уже нарисованное.

### 14.1. Идея

WebSocket пересылает только новые действия: тот, кто открыл ссылку позже, видит пустой холст. Поэтому сервер хранит **снимок холста** для каждой сессии:

- после каждого действия клиент отправляет `POST /image?id=...` с PNG холста;
- при открытии страницы клиент делает `GET /image?id=...` и рисует полученную картинку.

Почему HTTP, а не тот же сокет. Загрузка при входе — это запрос и ответ, и HTTP подходит под эту форму лучше. Кроме того, большая картинка в сокете задержала бы все мелкие сообщения рисования: они идут по одному соединению строго по очереди (раздел 10.3).

### 14.2. Data URL и base64

`canvas.toDataURL()` возвращает картинку прямо строкой: `data:image/png;base64,iVBORw0KGgo...`. После запятой — байты PNG в кодировке base64.

```js
const bytes = Buffer.from([0x89, 0x50, 0x4e, 0x47])   // первые 4 байта любого PNG
const b64 = bytes.toString('base64')
console.log(b64)                                      // iVBORw==
console.log(Buffer.from(b64, 'base64'))               // <Buffer 89 50 4e 47>
```

base64 записывает каждые 3 байта четырьмя символами, поэтому данные в нём **на треть тяжелее**, чем сами байты.

### 14.3. Наивный вариант

```js
// сервер
app.post('/image', (req, res) => {
  const data = req.body.img.replace('data:image/png;base64,', '')
  fs.writeFileSync(path.resolve(__dirname, 'files', `${req.query.id}.jpg`), data, 'base64')
  res.json({ message: 'Загружено' })
})

app.get('/image', (req, res) => {
  const file = fs.readFileSync(path.resolve(__dirname, 'files', `${req.query.id}.jpg`))
  res.json('data:image/png;base64,' + file.toString('base64'))
})

// клиент — на каждое нажатие мыши
fetch(`http://localhost:5000/image?id=${id}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ img: canvas.toDataURL() }),
})
```

Выглядит просто, но здесь восемь проблем.

1. **Снимок отстаёт на одно действие.** Если отправлять на `mousedown`, снимок уходит **до** штриха, который пользователь сейчас нарисует. На сервере всегда лежит состояние без последней фигуры: нарисовали, перезагрузили — последней фигуры нет.
2. **Лимит тела 100 КБ.** `express.json()` по умолчанию принимает тело до 102 400 байт. Насыщенный рисунок в base64 перерастает лимит, сервер отвечает `413 Payload Too Large`, и снимок молча перестаёт обновляться (*проверено*: тело 50 000 символов → 200, 200 000 → 413).
3. **Обход каталога (path traversal).** Имя файла берётся из `req.query.id` как есть. `POST /image?id=../../что-угодно` создаст файл в любом каталоге, доступном процессу.
4. **Новая сессия — 500.** Для свежей ссылки файла ещё нет, `readFileSync` бросает `ENOENT`, и запрос падает с ошибкой сервера. А «нет данных» — нормальная ситуация, а не сбой.
5. **Синхронный `fs` блокирует сервер.** `writeFileSync`/`readFileSync` останавливают цикл событий (event loop) Node, пока диск не ответит. Все WebSocket-сообщения всех сессий в это время ждут.
6. **Лишняя треть трафика**: base64 внутри JSON вместо самих байтов.
7. **PNG под именем `.jpg`**: расширение обманывает и человека, и программы.
8. **`__dirname` в ESM не существует**: в модуле с `"type": "module"` этот код упадёт с `ReferenceError`. Нужна папка текущего модуля, `import.meta.dirname` (раздел 9.4), а саму папку `files` нужно создать заранее.

### 14.4. Сервер

```js
// src/routes/image.js
import express from 'express'
import path from 'node:path'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { FILES_DIR } from '../config.js'

const ID_RE = /^[\w-]{1,64}$/
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

const filePath = (id) => path.join(FILES_DIR, `${id}.png`)

const isValidId = (id) => typeof id === 'string' && ID_RE.test(id)

export const imageRouter = express.Router()

imageRouter.post('/image', express.raw({ type: 'image/png', limit: '5mb' }), async (req, res) => {
  const { id } = req.query
  if (!isValidId(id)) return res.status(400).json({ message: 'Некорректный id' })

  const body = req.body
  if (!Buffer.isBuffer(body) || !body.subarray(0, 8).equals(PNG_SIGNATURE)) {
    return res.status(400).json({ message: 'Ожидается PNG' })
  }

  await mkdir(FILES_DIR, { recursive: true })
  await writeFile(filePath(id), body)
  res.sendStatus(204)
})

imageRouter.get('/image', async (req, res) => {
  const { id } = req.query
  if (!isValidId(id)) return res.status(400).json({ message: 'Некорректный id' })

  try {
    const data = await readFile(filePath(id))
    res.type('png').send(data)
  } catch (e) {
    if (e.code === 'ENOENT') return res.sendStatus(404)
    throw e
  }
})
```

- **`express.raw({ type: 'image/png', limit: '5mb' })` подключён только к этому маршруту.** Он читает тело в `Buffer`, но лишь при `Content-Type: image/png` и не больше 5 МБ. Холст 600 × 400 в PNG весит от единиц до сотен килобайт, так что запас большой.
- **Байты вместо base64.** Сервер получает и отдаёт файл как есть, без распаковки и упаковки.
- **Проверка `id`.** Регулярное выражение пропускает только буквы, цифры, `_` и `-`, так что ни `/`, ни `.` в путь не попадут. `typeof id === 'string'` нужен, потому что `?id=a&id=b` превращается в массив `['a', 'b']`.
- **Проверка сигнатуры PNG.** Любой PNG начинается с одних и тех же 8 байтов (`\x89PNG\r\n\x1a\n`). Без проверки сервер сохранил бы под именем `.png` что угодно, присланное с нужным заголовком. Это не полная проверка изображения, но мусор она отсекает.
- **404 для новой сессии.** Остальные ошибки чтения пробрасываются через `throw`. Express 5 сам ловит отклонённый промис асинхронного обработчика и отвечает 500. В Express 4 такое исключение осталось бы необработанным.
- **`fs/promises`** не блокирует цикл событий: пока файл пишется, сервер продолжает пересылать WebSocket-сообщения.
- **`express.Router()` для HTTP работает**, в отличие от WebSocket-маршрутов (раздел 10.2).

> **Внимание** — папку `files` мало создать при старте сервера (раздел 9.4). Если её удалят, пока сервер работает (например, скрипт очистки), каждый `POST` будет падать с `ENOENT` → 500. Пользователь увидит «чистый лист после F5», хотя рисование по сокету продолжает работать. Поэтому `mkdir(FILES_DIR, { recursive: true })` вызывается и перед каждой записью. Для существующей папки это дешёвая операция, а сервер перестаёт зависеть от того, что творится на диске после запуска.

Проверено (*проверено*):

```
GET  новая сессия                 → 404
POST png                          → 204
GET  после POST                   → 200, image/png, байты совпали с отправленными
GET  id=../src/index              → 400
POST id=../../evil                → 400
POST не PNG                       → 400
POST JSON вместо PNG              → 400
POST 6 МБ                         → 413
GET  ?id=s1&id=s2                 → 400
OPTIONS (предварительный запрос)  → 204, Access-Control-Allow-Headers: content-type
```

**Предварительный запрос CORS (preflight).** `Content-Type: image/png` не входит в список «простых» типов (`text/plain`, `multipart/form-data`, `application/x-www-form-urlencoded`). Поэтому перед POST браузер сам отправляет `OPTIONS` с вопросом, можно ли такой запрос с этого источника. `cors()` отвечает на него автоматически. Без ответа браузер не отправил бы POST вовсе, а в консоли была бы ошибка CORS.

### 14.5. Клиент

```ts
// api/image.ts
import { API_URL } from '../config.ts'

const imageUrl = (sessionId: string) => `${API_URL}/image?id=${encodeURIComponent(sessionId)}`

const toBlob = (canvas: HTMLCanvasElement) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))

export const saveImage = async (sessionId: string, canvas: HTMLCanvasElement) => {
  const blob = await toBlob(canvas)
  if (!blob) return

  const res = await fetch(imageUrl(sessionId), {
    method: 'POST',
    headers: { 'Content-Type': 'image/png' },
    body: blob,
  })
  if (!res.ok) throw new Error(`Не удалось сохранить рисунок: HTTP ${res.status}`)
}

export const loadImage = async (sessionId: string) => {
  const res = await fetch(imageUrl(sessionId), { cache: 'no-store' })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Не удалось загрузить рисунок: HTTP ${res.status}`)

  return createImageBitmap(await res.blob())
}
```

```tsx
// components/Canvas/Canvas.tsx — загрузка и сохранение
useEffect(() => {
  const canvas = canvasRef.current
  if (!id || !canvas) return

  let cancelled = false
  loadImage(id)
    .then((bitmap) => {
      if (!bitmap) return
      if (!cancelled) {
        const ctx = canvas.getContext('2d')
        ctx?.clearRect(0, 0, canvas.width, canvas.height)
        ctx?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
      }
      bitmap.close()
    })
    .catch(console.error)

  return () => {
    cancelled = true
  }
}, [id])

const mouseUpHandler = () => {
  if (id && canvasRef.current) saveImage(id, canvasRef.current).catch(console.error)
}

<canvas ... onMouseDown={mouseDownHandler} onMouseUp={mouseUpHandler} />
```

- **Снимок отправляется на `mouseup`, после действия.** Нативный `canvas.onmouseup` инструмента срабатывает раньше React-обработчика `onMouseUp` (раздел 8.3). К моменту снимка прямоугольник, круг или линия уже нарисованы окончательно, а их отправка по сокету уже ушла.
- **`toBlob` в промисе.** `canvas.toBlob` принимает колбэк и промиса не возвращает. Обёртка `new Promise((resolve) => canvas.toBlob(resolve, ...))` позволяет писать `await` и читать код сверху вниз. `resolve` передаётся колбэком напрямую: `toBlob` вызовет его с `Blob` или `null`.
- **`fetch` не бросает исключение на 404 или 500.** Промис выполняется для любого ответа сервера и отклоняется только при сетевой ошибке, поэтому `res.ok` (статус 200–299) проверяется вручную.
- **`cache: 'no-store'`.** Снимок меняется после каждого действия, а адрес остаётся тем же. Без этой опции браузер может отдать закешированную версию.
- **`createImageBitmap(blob)` вместо `new Image()` + `onload`.** Картинка декодируется в промисе, без колбэка, а `bitmap.close()` сразу освобождает декодированные пиксели.
- **Флаг `cancelled`.** Если пользователь перешёл в другую сессию раньше, чем пришёл ответ, функция очистки ставит флаг, и опоздавшая картинка старой сессии не рисуется поверх новой. В `StrictMode` эффект запускается дважды, и ответ первого запуска тоже отбрасывается этим флагом.
- **Ошибки сохранения не ломают рисование.** `.catch(console.error)`: рисунок остаётся на холсте и у участников по сокету, просто не сохранится на сервер.

> **Внимание** — картинка с другого источника (origin), нарисованная на холсте без CORS, делает холст «испорченным» (tainted canvas). Например, `img.src = 'http://localhost:5000/image?id=...'` без `img.crossOrigin = 'anonymous'`. После этого `toBlob`, `toDataURL` и `getImageData` бросают `SecurityError`, и перестают работать сохранение на сервер, undo и предпросмотр фигур. Здесь картинка приходит через `fetch`, который выполняет запрос в режиме CORS, а сервер отвечает `Access-Control-Allow-Origin: *`. Полученный `Blob` холст не портит.

### 14.6. Что остаётся нерешённым

- **Последний записавший побеждает (last write wins).** Каждый участник отправляет свой снимок, и снимок того, кто отпустил мышь позже, перезапишет снимок другого. Чужой штрих, который ещё не дошёл по сокету, при этом пропадёт с сервера.
- **Undo не сохраняется на сервер.** Отмена локальная (глава 8), и после перезагрузки страницы отменённое вернётся.
- **Отпускание мыши за пределами холста** не вызывает `onMouseUp` на холсте, и снимок не отправится до следующего действия.

> **На заметку** — вариант без хранения файлов на диске: при `connection` сервер просит одного из участников прислать новичку текущий снимок. Тогда пустой холст увидит только самый первый участник сессии, а рисунок пропадёт, когда уйдут все.

---

## Глава 15. Проверка и диагностика

**Цель главы:** уметь убедиться, что приложение работает, и быстро найти причину, когда оно не работает.

### 15.1. Сценарии проверки

**Совместное рисование.**

1. Запустить сервер и клиент (раздел 0.4).
2. Открыть `http://localhost:5173`: браузер перенаправит на `/<id>`. Ввести имя.
3. Скопировать **полный** адрес и открыть его во втором окне или в окне инкогнито. Ввести другое имя.
4. Рисовать в обоих окнах разными инструментами и цветами: каждое окно должно видеть рисунок другого.

В консоли (F12 → Console) первого окна должно появиться:

```
Подключение установлено
Пользователь Аня присоединился
Пользователь Боря присоединился
```

Во втором — только своя строка: о тех, кто был в сессии раньше, сервер не сообщает (раздел 12.5).

**Снимок по HTTP.**

1. Нарисовать линию и прямоугольник, нажать F5 и снова ввести имя: рисунок на месте, вместе с последней фигурой.
2. Открыть ту же ссылку в новой вкладке: рисунок появляется сразу, ещё до ввода имени, потому что загрузка идёт по HTTP и от сокета не зависит.

Во вкладке Network (фильтр `image`) после отпускания мыши видны два запроса:

| Запрос | Ожидание |
|---|---|
| `OPTIONS image?id=…` | 204 — предварительный запрос CORS |
| `POST image?id=…` | 204, в Payload двоичные данные, а не JSON |

При перезагрузке страницы будет `GET image?id=…` со статусом 200, а на вкладке Preview — сама картинка. Для новой сессии GET вернёт **404**, и это нормально: в ней ещё не рисовали.

На диске после рисования появляется `server/files/<id>.png`.

**Защита сервера.**

```bash
curl -i "http://localhost:5000/image?id=../src/index"                                   # 400
curl -i -X POST "http://localhost:5000/image?id=test" -H "Content-Type: image/png" --data "hello"  # 400
curl -i "http://localhost:5000/image?id=no-such-session"                                # 404
```

> **Внимание** — в Windows PowerShell 5.1 `curl` — это псевдоним `Invoke-WebRequest` с другим синтаксисом. Пишите `curl.exe` или используйте Postman.

### 15.2. Таблица симптомов

| Симптом | Причина | Что сделать |
|---|---|---|
| окна не видят рисунки друг друга, ошибок нет | разные id в адресе: второе окно открыто с корня и получило новую сессию | открыть во втором окне полный адрес первого |
| окно ничего не отправляет и не получает | в нём не введено имя: сокет открывается только после ввода | ввести имя |
| в консоли `Соединение закрыто`, синхронизация пропала | сервер перезапустился (`node --watch` после сохранения файла) или пропала сеть | обновить вкладку; на будущее — переподключение (раздел 12.6) |
| `WebSocket connection to 'ws://localhost:5000/' failed` | сервер не запущен или не на порту 5000 | запустить `npm run dev` в `server` |
| `WebSocket is closed before the connection is established` | `StrictMode` в dev-режиме закрыл первый из двух сокетов | ничего, это ожидаемо (раздел 12.4) |
| после F5 чистый лист, POST отвечает **500** | на диске нет папки `server/files` (удалили во время работы сервера) | `mkdir` перед записью (раздел 14.4), перезапустить сервер |
| POST отвечает **413** | тело больше лимита `express.raw` | увеличить `limit` или уменьшить картинку |
| POST отвечает **400** «Ожидается PNG» | запрос ушёл не с клиента или с другим `Content-Type` | отправлять `image/png` |
| POST не появляется в Network | мышь отпущена за пределами холста | известное ограничение (раздел 14.6) |
| в консоли ошибка CORS | сервер не ответил на `OPTIONS` или без заголовков CORS | проверить, что `app.use(cors())` стоит до маршрутов |
| `crypto.randomUUID is not a function` | страница открыта по `http://` не с `localhost` | использовать `generateId` (раздел 11.3) |
| класс CSS не применяется | опечатка в `styles.имя`, ошибки типов нет | сверить имя с классом в `.module.scss` |
| Ctrl+клик в WebStorm не ведёт к объявлению | TypeScript 7 без `tsserver` | TypeScript 6 и путь к нему в настройках IDE (раздел 2.3) |
| сервер падает с `SyntaxError ... is not valid JSON` | `JSON.parse` без защиты | разбор через `parse`, возвращающий `null` (раздел 10.4) |

> **Важно** — проверочные скрипты не должны трогать рабочие папки проекта. Удалить `server/files` «после теста», пока работает основной dev-сервер, — ровно тот способ, которым получается «чистый лист после F5». Тестам нужна своя папка данных, а удалять стоит только файлы, созданные самим тестом.

---

## Глава 16. Итоговая структура, ограничения и что дальше

**Цель главы:** собрать картину целиком и наметить следующие шаги.

### 16.1. Как данные проходят через приложение

Один штрих кисти, от мыши до чужого экрана:

```
mousemove на холсте A
  → Brush.createFigure        отрезок { type: 'brush', x0, y0, x1, y1, width, color }
  → Brush.draw (у себя)       save → стиль из фигуры → путь → stroke → restore
  → Tool.sendFigure           сокет из canvasState, если он OPEN
  → сервер: parse → switch    method === 'draw'
  → drawHandler               сессия из ws.id, рассылка всем, кроме отправителя
  → клиент B: parseMessage    Message, сужение по method
  → drawFigure                сужение по figure.type
  → Brush.draw (у B)          та же функция, что у A
mouseup на холсте A
  → saveImage                 toBlob → POST /image → files/<id>.png
```

Карта файлов приведена в разделе 0.4.

### 16.2. Ключевые решения

| Решение | Почему |
|---|---|
| инструменты — классы на DOM, а не компоненты | мышь даёт десятки событий в секунду, пиксели хранит холст, React здесь не нужен (раздел 5.4) |
| обработчики через свойства `onmouse*` | новый инструмент заменяет обработчики старого (раздел 6.1) |
| предпросмотр через `getImageData` / `putImageData` | синхронно, без мерцания (раздел 6.3) |
| ластик через `destination-out` | стирает до прозрачности и не меняет цвет другим (раздел 6.6) |
| история — снимки `ImageData` с лимитом | синхронное восстановление без гонок (раздел 8.2) |
| сессия — неугадываемый id в адресе | ссылка и есть приглашение (глава 11) |
| протокол — JSON с полем `method`, типы на клиенте | ошибка в сообщении ловится компилятором (раздел 12.3) |
| фигура в сообщении самодостаточна | нет общего пути и чужих настроек (глава 13) |
| свой штрих рисуется сразу, сервер не шлёт эхо | нет задержки у рисующего (глава 13) |
| сессия на сервере — из соединения, а не из сообщения | нельзя рисовать в чужой сессии (раздел 13.9) |
| снимок — байты PNG по HTTP после действия | без лимита JSON, без отставания на шаг (глава 14) |

### 16.3. Известные ограничения

- предпросмотр фигур стирает чужие штрихи, пришедшие за время протягивания мыши (раздел 13.10);
- undo откатывает и чужие штрихи, причём только у отменившего, и не сохраняется на сервер;
- снимок на сервере работает по правилу «последний записавший побеждает» (раздел 14.6);
- нет переподключения после обрыва связи и проверки «живых» соединений (раздел 12.6);
- рассылка перебирает все соединения сервера, а не только участников сессии (раздел 12.5);
- кисть отправляет сообщение на каждое движение мыши, без группировки (раздел 13.10);
- `cors()` разрешает любой источник, а WebSocket принимает подключения с любой страницы (раздел 9.3).

### 16.4. Что дальше

1. **Переподключение.** В `onclose` открывать сокет заново с нарастающей задержкой и повторно отправлять `connection`.
2. **Комнаты на сервере.** `Map<sessionId, Set<ws>>`: добавлять в `connection`, удалять в `close`, рассылать только по нужному `Set`. Плюс `ping`/`pong` и `ws.terminate()` для мёртвых соединений.
3. **Рисунок как список команд.** Сервер хранит действия сессии, новичок получает их и перерисовывает холст, undo удаляет команду у всех. Это решает сразу три ограничения: предпросмотр, общий undo и «последний записавший побеждает».
4. **Слой предпросмотра.** Второй прозрачный `<canvas>` поверх основного: фигура рисуется на нём, и снимок для предпросмотра больше не нужен.
5. **Базовый класс фигуры.** `ShapeTool` с абстрактными `createFigure` и `drawFigure` вместо трёх почти одинаковых классов.
6. **Группировка сообщений.** Копить отрезки и отправлять пачкой раз в кадр.
7. **Проверка источника.** `cors({ origin })` для HTTP и проверка заголовка `Origin` при WebSocket-рукопожатии.
8. **Общие типы протокола.** Сейчас клиент и сервер описывают `Message` каждый у себя (глава 17). Общий файл типов, подключённый в оба проекта через `import type`, исключил бы расхождения: импорт типа стирается при сборке и запуске, поэтому Vite и Node не будут даже пытаться загрузить этот файл.
9. **Полная проверка сообщений на сервере.** Сервер уже проверяет форму сообщения (раздел 17.4), но содержимое `figure` пропускает как есть. Схема (например, zod) для каждого типа фигуры не дала бы пересылать мусор внутри неё.

---

## Глава 17. Сервер на TypeScript

**Цель главы:** перевести сервер на TypeScript без шага сборки и понять, где типы библиотек расходятся с реальностью.

### 17.1. Запуск без сборки

Node 24 умеет запускать `.ts`-файлы напрямую: перед выполнением он **удаляет** аннотации типов (type stripping), заменяя их пробелами. Компилятор для запуска не нужен:

```json
{
  "main": "src/index.ts",
  "scripts": {
    "dev": "node --watch src/index.ts",
    "start": "node src/index.ts",
    "typecheck": "tsc"
  }
}
```

У такого запуска есть ограничения, и они определяют настройки проекта:

| Ограничение Node | Как учтено |
|---|---|
| только удаляет типы, ничего не генерирует: `enum`, `namespace`, свойства-параметры конструктора не работают | `erasableSyntaxOnly` превращает такой синтаксис в ошибку компиляции |
| не проверяет типы | отдельный скрипт `npm run typecheck` (`tsc`) |
| требует расширение `.ts` в импортах своих файлов | `allowImportingTsExtensions` + `noEmit` |
| не читает `tsconfig.json`: ни `paths`, ни другие настройки | алиасы путей не используются |

> **Важно** — запуск и проверка типов разделены. `npm run dev` запустит сервер даже с ошибками типов, потому что Node их не видит. Перед коммитом нужен `npm run typecheck`.

### 17.2. Настройки и пакеты типов

```bash
npm install -D typescript@~6.0.3 @types/node@24 @types/express@5 @types/express-ws @types/ws @types/cors
```

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "es2024",
    "lib": ["ES2024"],
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "types": ["node"],
    "strict": true,
    "noEmit": true,
    "allowImportingTsExtensions": true,
    "erasableSyntaxOnly": true,
    "verbatimModuleSyntax": true,
    "skipLibCheck": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```

- **`module: "nodenext"`** — TypeScript разрешает импорты по правилам самого Node: с `"type": "module"` файлы считаются ESM, а пакеты на CommonJS импортируются через `import x from`, как и в рантайме.
- **`lib: ["ES2024"]` без `DOM`** — на сервере нет `document` и `window`, и случайное обращение к ним станет ошибкой. Глобальные `Buffer`, `process`, `fetch` описаны в `@types/node`.
- **`verbatimModuleSyntax`** — импорт, используемый только как тип, обязан быть помечен `type`. Для запуска через Node это важно вдвойне: Node удаляет `import type` целиком, а обычный импорт оставляет и пытается загрузить.

> **Внимание** — типы библиотек описывают не тот рантайм, что работает в проекте, причём в двух местах:
>
> - **`@types/express-ws` объявляет `.ws` у `express.Router()`**, хотя на Express 5 этого метода нет (раздел 10.2, *проверено*). TypeScript разрешит `express.Router().ws(...)`, а сервер упадёт с `TypeError`. Типы здесь — обещание, а не гарантия.
> - **`@types/ws` описывает `ws` 8**, а `express-ws` 5 работает на `ws` 7. В типах сообщение — `RawData` (`Buffer | ArrayBuffer | Buffer[]`), а в рантайме приходит строка. Разбор через `raw.toString()` корректен для обоих случаев.

### 17.3. Сборка приложения

```ts
// src/app.ts
import express from 'express'
import expressWs from 'express-ws'
import cors from 'cors'
import { imageRouter } from './routes/image.ts'
import { registerWs } from './ws/index.ts'

export const createApp = () => {
  const { app, getWss } = expressWs(express())
  const wss = getWss()

  app.use(cors())
  app.use(express.json())

  app.use(imageRouter)
  registerWs(app, wss)

  return app
}
```

```ts
// src/config.ts
import path from 'node:path'

export const PORT = Number(process.env.PORT) || 5000
export const FILES_DIR = path.join(import.meta.dirname, '..', 'files')
```

- **`app` берётся из результата `expressWs(...)`.** У переданного приложения тип `express.Application`, и метода `.ws` в нём нет. А `expressWs(...).app` типизирован как `expressWs.Application`, то есть приложение с методом `.ws`. Объект один и тот же, отличается только тип.
- **`Number(process.env.PORT) || 5000`.** В JavaScript `process.env.PORT || 5000` давал `string | number`, и `listen` молча принимал строку. Тип `process.env.PORT` — `string | undefined`, и TypeScript требует явного решения. `Number(undefined)` даёт `NaN`, и `|| 5000` подставит порт по умолчанию.

### 17.4. Сообщения: тип и проверка формы

```ts
// src/ws/messages.ts
import type { WebSocket } from 'ws'

export type ConnectionMessage = {
  method: 'connection'
  id: string
  username: string
}

// фигуру сервер не разбирает, а только пересылает
export type DrawMessage = {
  method: 'draw'
  id: string
  figure: unknown
}

export type Message = ConnectionMessage | DrawMessage

// соединение с меткой сессии, которую ставит обработчик connection
export type SessionSocket = WebSocket & { id?: string }

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

export const isMessage = (value: unknown): value is Message => {
  if (!isObject(value) || typeof value.id !== 'string') return false

  switch (value.method) {
    case 'connection':
      return typeof value.username === 'string'
    case 'draw':
      return isObject(value.figure)
    default:
      return false
  }
}
```

```ts
// src/ws/index.ts
import type expressWs from 'express-ws'
import type { RawData, WebSocketServer } from 'ws'
import { connectionHandler } from './handlers/connection.ts'
import { drawHandler } from './handlers/draw.ts'
import { isMessage, type Message } from './messages.ts'

// типы описывают ws 8 (Buffer), express-ws работает на ws 7 и отдаёт строку — toString подходит обоим
const parse = (raw: RawData | string): Message | null => {
  try {
    const value: unknown = JSON.parse(raw.toString())
    return isMessage(value) ? value : null
  } catch {
    return null
  }
}

export const registerWs = (app: expressWs.Application, wss: WebSocketServer) => {
  app.ws('/', (ws) => {
    ws.on('message', (raw) => {
      const msg = parse(raw)
      if (!msg) return

      switch (msg.method) {
        case 'connection':
          connectionHandler(ws, msg, wss)
          break
        case 'draw':
          drawHandler(ws, msg, wss)
          break
      }
    })
  })
}
```

Наивный вариант на TypeScript — утверждение типа: `const msg = JSON.parse(raw) as Message`. Проблема в том, что сервер — граница доверия. Сообщение может прислать кто угодно из консоли браузера, а `as` ничего не проверяет. `{ method: 'connection', id: 's1' }` без `username` прошло бы как `ConnectionMessage` и разошлось бы всем участникам.

Рабочий вариант — **предикат типа** (type guard) `isMessage(value): value is Message`. Это обычная функция, которая проверяет значение в рантайме, а её возвращаемый тип говорит компилятору: если вернулось `true`, значение — `Message`. `JSON.parse` возвращает `any`, поэтому результат сразу кладётся в переменную типа `unknown`: дальше без проверки с ним ничего сделать нельзя.

- **Проверяется форма, а не содержимое фигуры.** Сервер в фигуры не заглядывает (раздел 13.9), поэтому `figure: unknown` и проверка только того, что это объект. Новый тип фигуры по-прежнему не требует менять сервер.
- **`switch (msg.method)` сужает тип.** В `case 'connection'` у `msg` тип `ConnectionMessage`, и `connectionHandler` получает именно его.
- **Типы сообщений на сервере свои.** Клиент описывает `Figure` подробно, а серверу достаточно знать метод и сессию. Общий файл типов для обоих проектов — следующий шаг (раздел 16.4).

> **На заметку** — в клиенте `parseMessage` осталась с `as Message` (раздел 12.3). Там данные приходят от собственного сервера, который уже проверил форму, а цена ошибки ниже: неверное сообщение испортит рисунок в одной вкладке, а не у всех участников.

### 17.5. Метка сессии на соединении

```ts
// src/ws/broadcast.ts
import type { WebSocketServer } from 'ws'
import type { Message, SessionSocket } from './messages.ts'

export const broadcast = (wss: WebSocketServer, msg: Message, except: SessionSocket | null = null) => {
  wss.clients.forEach((client: SessionSocket) => {
    if (client !== except && client.id === msg.id) {
      client.send(JSON.stringify(msg))
    }
  })
}
```

```ts
// src/ws/handlers/connection.ts
import type { WebSocketServer } from 'ws'
import { broadcast } from '../broadcast.ts'
import type { ConnectionMessage, SessionSocket } from '../messages.ts'

export const connectionHandler = (ws: SessionSocket, msg: ConnectionMessage, wss: WebSocketServer) => {
  ws.id = msg.id
  broadcast(wss, msg)
}
```

```ts
// src/ws/handlers/draw.ts
import type { WebSocketServer } from 'ws'
import { broadcast } from '../broadcast.ts'
import type { DrawMessage, SessionSocket } from '../messages.ts'

export const drawHandler = (ws: SessionSocket, msg: DrawMessage, wss: WebSocketServer) => {
  // сессия берётся из соединения, а не из сообщения: рисовать можно только там, куда подключился
  if (!ws.id) return
  broadcast(wss, { ...msg, id: ws.id }, ws)
}
```

В JavaScript метка сессии записывалась прямо на объект соединения: `ws.id = msg.id`. В TypeScript у `WebSocket` нет поля `id`, и такое присваивание — ошибка. Тип `SessionSocket = WebSocket & { id?: string }` описывает соединение с необязательной меткой. Поле `id?` необязательное, потому что до сообщения `connection` метки нет. Отсюда проверка `if (!ws.id)` в `drawHandler`: теперь её требует и компилятор.

> **На заметку** — другой способ хранить метку — `WeakMap<WebSocket, string>`: соединение служит ключом, и сторонний объект не меняется. Запись в `WeakMap` исчезает вместе с закрытым соединением, утечки нет. Но `wss.clients` всё равно перебирается целиком, так что по-настоящему структуру меняют только комнаты `Map<sessionId, Set<WebSocket>>` (раздел 12.5).

### 17.6. HTTP-маршрут

```ts
// src/routes/image.ts (отличия от JavaScript-версии)
const filePath = (id: string) => path.join(FILES_DIR, `${id}.png`)

const isValidId = (id: unknown): id is string => typeof id === 'string' && ID_RE.test(id)

const isNotFound = (e: unknown) => e instanceof Error && 'code' in e && e.code === 'ENOENT'

imageRouter.post('/image', express.raw({ type: 'image/png', limit: '5mb' }), async (req, res) => {
  const { id } = req.query
  if (!isValidId(id)) return res.status(400).json({ message: 'Некорректный id' })

  const body: unknown = req.body
  if (!Buffer.isBuffer(body) || !body.subarray(0, 8).equals(PNG_SIGNATURE)) {
    return res.status(400).json({ message: 'Ожидается PNG' })
  }
  // ...
})
```

- **`isValidId` — предикат типа.** У `req.query.id` тип `string | ParsedQs | (string | ParsedQs)[] | undefined`: строка, вложенный объект (`?id[a]=1`), массив (`?id=a&id=b`) или ничего. После проверки TypeScript знает, что `id` — строка, и `filePath(id)` компилируется.
- **`req.body` — в `unknown`.** Express типизирует тело как `any`, поэтому оно явно переводится в `unknown`. Дальше `Buffer.isBuffer(body)` сужает тип до `Buffer`.
- **`isNotFound(e)`.** В `catch` у `e` тип `unknown`, ведь бросить можно что угодно. Проверка `e instanceof Error && 'code' in e` сужает тип так, что `e.code` можно читать без утверждения `as NodeJS.ErrnoException`.

### 17.7. Проверка

`tsc` проходит без ошибок. Те же сценарии, что для JavaScript-версии, дают тот же результат (*проверено*, сервер запущен как `node src/index.ts`):

```
WebSocket
  'not json'                                  → отброшено
  { method: 'connection', id: 's1' }          → отброшено (нет username)
  { method: 'draw', figure: 'строка' }        → отброшено (figure не объект)
  connection A, B в s1; C в s2                → A видит A и B, B видит B, C видит C
  draw от A                                   → получил только B
  draw от A с подменённым id                  → получил B, C не получил
  draw от D без connection                    → не получил никто

HTTP
  GET новая сессия → 404     POST png → 204     GET после POST → 200, байты совпали
  GET id=../src/index → 400  POST не PNG → 400  POST 6 МБ → 413
  GET ?id=a&id=b → 400       OPTIONS → 204, Access-Control-Allow-Headers: content-type
```

Новое по сравнению с JavaScript-версией — первые три строки: сообщения неправильной формы раньше доходили до обработчиков, а теперь отбрасываются на входе.

---

# Часть II. Что проверено и источники

## Что проверено

Утверждения с пометкой *проверено* подтверждены запуском кода или чтением исходников библиотек в `node_modules`. Версии: Node 24.18, Express 5.3.0, express-ws 5.0.2, ws 7.5.13, cors 2.8.6, Vite 8.3.4, React 19.3.1, TypeScript 6.0.3 (и 7.0.2 для сравнения), MobX 7.0.6, mobx-react-lite 5.1.0, react-router 8.4.0.

| Утверждение | Как проверено |
|---|---|
| `express-ws` 5 работает с Express 5; клиент подключается к `ws://localhost:5000/`, обычный `GET /` даёт 404 | сервер и клиенты `WebSocket` из Node 24 |
| `express.Router().ws` в Express 5 — `undefined`, у `app.ws` метод есть | запуск в Node |
| `app.ws('/')` регистрирует `GET` на `/.websocket` | `node_modules/express-ws/lib/add-ws-method.js`, `websocket-url.js` |
| `JSON.parse` на сообщении не в формате JSON без защиты роняет процесс (код выхода 1) | запуск сервера и отправка `'not json'` |
| `send(объект)` доставляет `"[object Object]"`, бинарный кадр приходит в Node как `Buffer`, эхо возвращает `ArrayBuffer` | клиенты `WebSocket` из Node 24 |
| `ws` по умолчанию: `maxPayload` = 100 МБ | `node_modules/ws/lib/websocket-server.js` |
| `express.json()` по умолчанию: лимит 102 400 байт, 200 000 символов → 413 | `node_modules/body-parser/lib/utils.js` и запрос |
| рассылка `connection`: кто кого видит в сессии | три клиента в двух сессиях |
| рассылка `draw`: только другим участникам сессии, подмена `id` и отсутствие `connection` не работают | четыре клиента |
| маршруты `/image`: 204/200/404/400/413, совпадение байтов, ответ на `OPTIONS` | запросы `fetch` и `curl` |
| `echo.websocket.org` отвечает приветствием и эхом | клиент `WebSocket` из Node 24 |
| строгий режим TypeScript включён без `"strict": true` (TS7006, TS2322, TS2564) | `tsc` на пробных файлах, TypeScript 6 и 7 |
| в `typescript@7` нет `lib/tsserver.js` и `lib/typescript.js`, в 6.0.3 они есть | содержимое `node_modules/typescript/lib` |
| `satisfies never` ловит пропущенный `case` (TS1360) | `tsc` на пробном файле |
| `makeAutoObservable` делает поля класса observable при `useDefineForClassFields`, в том числе поле без инициализатора | `isObservableProp`, `autorun` в Node |
| API `makeAutoObservable` / `autorun` в MobX 7 не изменился | запуск в Node |
| логика undo/redo: порядок, очистка redo, лимит 50 | имитация холста в Node |
| CSS-модуль даёт класс вида `app_pgifq_1` | ответ dev-сервера Vite |
| иконки меньше 4 КБ встраиваются в CSS, CSS 4,9 КБ | `vite build` |
| Vite dev и `vite preview` отдают `index.html` на путь `/<id>` | HTTP-запросы к серверам Vite |
| у `<dialog>` в `@types/react` есть атрибут `closedby` | `node_modules/@types/react/index.d.ts` |
| вычисление `Sec-WebSocket-Accept` | пример из RFC 6455 в Node |
| сервер на TypeScript запускается как `node src/index.ts` и ведёт себя так же, как JavaScript-версия; сообщения неправильной формы отбрасываются | `tsc`, тот же набор WebSocket- и HTTP-сценариев |
| `@types/express-ws` объявляет `.ws` у `express.Router`, `@types/ws` 8 типизирует сообщение как `RawData` | `node_modules/@types/express-ws/index.d.ts`, `@types/ws` |

**Что не проверялось запуском:** поведение в браузере, которое требует ручного взаимодействия. Это рисование мышью, отмена Esc у `<dialog>` в разных браузерах, скачивание файла, предупреждение `StrictMode` о закрытом сокете, «испорченный» холст. Эти утверждения опираются на спецификации и документацию из списка ниже.

## Источники

- RFC 6455. The WebSocket Protocol — https://datatracker.ietf.org/doc/html/rfc6455
- HTML Living Standard: элемент `canvas` — https://html.spec.whatwg.org/multipage/canvas.html
- HTML Living Standard: элемент `dialog` — https://html.spec.whatwg.org/multipage/interactive-elements.html#the-dialog-element
- MDN: WebSocket API — https://developer.mozilla.org/en-US/docs/Web/API/WebSocket
- MDN: Canvas API — https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API
- MDN: CORS — https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS
- MDN: Secure contexts — https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts
- Express 5 API — https://expressjs.com/en/5x/api.html
- ws — https://github.com/websockets/ws
- express-ws — https://github.com/HenningM/express-ws
- MobX — https://mobx.js.org
- React — https://react.dev
- React Router — https://reactrouter.com
- Vite — https://vite.dev
- TypeScript — https://www.typescriptlang.org/docs/
- Node.js: модули ESM — https://nodejs.org/api/esm.html
- Node.js: запуск TypeScript — https://nodejs.org/api/typescript.html
