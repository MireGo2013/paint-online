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
