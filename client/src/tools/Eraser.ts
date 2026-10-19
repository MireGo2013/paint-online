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
