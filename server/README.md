# Paint Online — сервер

Сервер совместного графического редактора: пересылает действия рисования участникам сессии по WebSocket и хранит снимок холста.

**Стек:** Node 24, Express 5, `express-ws` 5, ESM, TypeScript 6 (запуск без сборки: Node 24 сам удаляет типы).

```bash
npm install
npm run dev        # node --watch, порт 5000 (или PORT из окружения)
npm run typecheck  # проверка типов: tsc
```

- WebSocket: `ws://localhost:5000/`
- `POST /image?id=<сессия>` — сохранить снимок холста, тело — PNG (`Content-Type: image/png`, до 5 МБ), ответ 204
- `GET /image?id=<сессия>` — снимок холста в PNG, 404 если сессия ещё не сохранялась

Снимки хранятся в `files/<id>.png`, папка создаётся при старте.

## Структура

```
src/
├── index.ts               точка входа: создать папку files, создать приложение и запустить
├── app.ts                 сборка приложения: express-ws, middleware, маршруты
├── config.ts              порт и путь к папке files
├── routes/
│   └── image.ts           HTTP: сохранение и выдача снимка холста
└── ws/
    ├── index.ts           WebSocket-маршрут: разбор JSON и switch по method
    ├── messages.ts        типы сообщений и проверка их формы
    ├── broadcast.ts       рассылка участникам сессии
    └── handlers/          по файлу на тип сообщения
        ├── connection.ts
        └── draw.ts
```
