import canvasState from '../../store/canvasState.ts'
import toolState from '../../store/toolState.ts'
import Brush from '../../tools/Brush.ts'
import Circle from '../../tools/Circle.ts'
import Eraser from '../../tools/Eraser.ts'
import Line from '../../tools/Line.ts'
import Rect from '../../tools/Rect.ts'
import type Tool from '../../tools/Tool.ts'
import styles from './Toolbar.module.scss'

type ToolClass = new (canvas: HTMLCanvasElement) => Tool

const Toolbar = () => {
  const selectTool = (ToolClass: ToolClass) => {
    if (canvasState.canvas) toolState.setTool(new ToolClass(canvasState.canvas))
  }

  const changeColor = (color: string) => {
    toolState.setStrokeColor(color)
    toolState.setFillColor(color)
  }

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

  return (
    <div className={styles.toolbar}>
      <button
        type="button"
        className={`${styles.btn} ${styles.brush}`}
        aria-label="Кисть"
        onClick={() => selectTool(Brush)}
      />
      <button
        type="button"
        className={`${styles.btn} ${styles.rect}`}
        aria-label="Прямоугольник"
        onClick={() => selectTool(Rect)}
      />
      <button
        type="button"
        className={`${styles.btn} ${styles.circle}`}
        aria-label="Круг"
        onClick={() => selectTool(Circle)}
      />
      <button
        type="button"
        className={`${styles.btn} ${styles.eraser}`}
        aria-label="Ластик"
        onClick={() => selectTool(Eraser)}
      />
      <button
        type="button"
        className={`${styles.btn} ${styles.line}`}
        aria-label="Линия"
        onClick={() => selectTool(Line)}
      />
      <input
        type="color"
        className={styles.color}
        aria-label="Цвет"
        onChange={(e) => changeColor(e.target.value)}
      />
      <button
        type="button"
        className={`${styles.btn} ${styles.undo}`}
        aria-label="Отменить"
        onClick={() => canvasState.undo()}
      />
      <button
        type="button"
        className={`${styles.btn} ${styles.redo}`}
        aria-label="Повторить"
        onClick={() => canvasState.redo()}
      />
      <button
        type="button"
        className={`${styles.btn} ${styles.save}`}
        aria-label="Сохранить"
        onClick={download}
      />
    </div>
  )
}

export default Toolbar
