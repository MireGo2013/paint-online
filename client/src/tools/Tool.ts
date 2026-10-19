import canvasState from '../store/canvasState.ts'
import type {Figure} from '../ws/messages.ts'
import {sendMessage} from '../ws/socket.ts'

export default class Tool {
    canvas: HTMLCanvasElement
    ctx: CanvasRenderingContext2D

    constructor(canvas: HTMLCanvasElement) {
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('2D context is not supported')

        this.canvas = canvas
        this.ctx = ctx
        this.destroyEvents()
    }

    set fillColor(color: string) {
        this.ctx.fillStyle = color
    }

    set strokeColor(color: string) {
        this.ctx.strokeStyle = color
    }

    set lineWidth(width: number) {
        this.ctx.lineWidth = width
    }

    destroyEvents() {
        this.canvas.onmousemove = null
        this.canvas.onmousedown = null
        this.canvas.onmouseup = null
    }

    protected sendFigure(figure: Figure) {
        const {socket, sessionId} = canvasState
        if (socket?.readyState !== WebSocket.OPEN || !sessionId) return
        sendMessage(socket, {method: 'draw', id: sessionId, figure})
    }
}
