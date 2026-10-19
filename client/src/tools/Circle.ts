import type { CircleFigure } from '../ws/messages.ts'
import Tool from './Tool.ts'

export default class Circle extends Tool {
  mouseDown = false
  startX = 0
  startY = 0
  saved: ImageData | null = null
  figure: CircleFigure | null = null

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
      type: 'circle',
      x: this.startX,
      y: this.startY,
      r: Math.hypot(e.offsetX - this.startX, e.offsetY - this.startY),
      fillColor: String(this.ctx.fillStyle),
      strokeColor: String(this.ctx.strokeStyle),
      lineWidth: this.ctx.lineWidth,
    }

    if (this.saved) this.ctx.putImageData(this.saved, 0, 0)
    Circle.draw(this.ctx, this.figure)
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
}
