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
