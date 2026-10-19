# Paint Online — клиент

Клиент совместного графического редактора: несколько человек рисуют на одном холсте в реальном времени.

**Стек:** Vite 8, React 19, TypeScript 6, MobX 7, react-router 8, SCSS-модули (`sass-embedded`).

```bash
npm install
npm run dev     # http://localhost:5173
npm run build   # проверка типов + сборка в dist/
npm run lint    # oxlint
```

## Структура

```
src/
├── assets/img/   иконки инструментов
├── pages/        страницы маршрутов: PaintPage
├── components/   Toolbar, SettingBar, Canvas (+ *.module.scss рядом)
├── utils/        generateId
├── store/        MobX-сторы: toolState, canvasState
├── tools/        классы инструментов: Tool, Brush, Rect, Circle, Line, Eraser
├── styles/       variables.scss, global.scss
├── App.tsx
└── main.tsx
```
