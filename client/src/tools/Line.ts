import type { LineFigure } from '../ws/messages.ts'
import Tool from './Tool.ts'

export default class Line extends Tool {
  mouseDown = false
  startX = 0
  startY = 0
  saved: ImageData | null = null
  figure: LineFigure | null = null

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
      type: 'line',
      x0: this.startX,
      y0: this.startY,
      x1: e.offsetX,
      y1: e.offsetY,
      strokeColor: String(this.ctx.strokeStyle),
      lineWidth: this.ctx.lineWidth,
    }

    if (this.saved) this.ctx.putImageData(this.saved, 0, 0)
    Line.draw(this.ctx, this.figure)
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
}
