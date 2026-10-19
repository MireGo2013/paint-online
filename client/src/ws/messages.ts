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
