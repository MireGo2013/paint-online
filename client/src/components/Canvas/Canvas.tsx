import { useEffect, useRef } from 'react'
import { observer } from 'mobx-react-lite'
import { useParams } from 'react-router'
import { loadImage, saveImage } from '../../api/image.ts'
import canvasState from '../../store/canvasState.ts'
import toolState from '../../store/toolState.ts'
import Brush from '../../tools/Brush.ts'
import styles from './Canvas.module.scss'

const Canvas = observer(() => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { id } = useParams<{ id: string }>()

  useEffect(() => {
    if (!canvasRef.current) return
    canvasState.setCanvas(canvasRef.current)
    toolState.setTool(new Brush(canvasRef.current))
  }, [])

  useEffect(() => {
    if (id) canvasState.setSessionId(id)
  }, [id])

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

  const mouseDownHandler = () => {
    const data = canvasState.snapshot()
    if (data) canvasState.pushToUndo(data)
  }

  const mouseUpHandler = () => {
    if (id && canvasRef.current) saveImage(id, canvasRef.current).catch(console.error)
  }

  return (
    <div className={styles.wrapper}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        width={600}
        height={400}
        onMouseDown={mouseDownHandler}
        onMouseUp={mouseUpHandler}
      />
    </div>
  )
})

export default Canvas
