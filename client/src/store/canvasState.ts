import { makeAutoObservable } from 'mobx'

const MAX_HISTORY = 50

class CanvasState {
  canvas: HTMLCanvasElement | null = null
  sessionId: string | null = null
  username = ''
  socket: WebSocket | null = null
  undoList: ImageData[] = []
  redoList: ImageData[] = []

  constructor() {
    makeAutoObservable(this)
  }

  setCanvas(canvas: HTMLCanvasElement) {
    this.canvas = canvas
  }

  setSessionId(id: string) {
    this.sessionId = id
  }

  setUsername(username: string) {
    this.username = username
  }

  setSocket(socket: WebSocket | null) {
    this.socket = socket
  }

  get ctx() {
    return this.canvas?.getContext('2d') ?? null
  }

  snapshot() {
    if (!this.canvas || !this.ctx) return null
    return this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)
  }

  pushToUndo(data: ImageData) {
    this.undoList.push(data)
    if (this.undoList.length > MAX_HISTORY) this.undoList.shift()
    this.redoList = []
  }

  undo() {
    const current = this.snapshot()
    const previous = this.undoList.pop()
    if (!current || !previous) return

    this.redoList.push(current)
    this.ctx?.putImageData(previous, 0, 0)
  }

  redo() {
    const current = this.snapshot()
    const next = this.redoList.pop()
    if (!current || !next) return

    this.undoList.push(current)
    this.ctx?.putImageData(next, 0, 0)
  }
}

export default new CanvasState()
