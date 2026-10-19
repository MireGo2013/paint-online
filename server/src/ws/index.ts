import type expressWs from 'express-ws'
import type { RawData, WebSocketServer } from 'ws'
import { connectionHandler } from './handlers/connection.ts'
import { drawHandler } from './handlers/draw.ts'
import { isMessage, type Message } from './messages.ts'

// типы описывают ws 8 (Buffer), express-ws работает на ws 7 и отдаёт строку — toString подходит обоим
const parse = (raw: RawData | string): Message | null => {
  try {
    const value: unknown = JSON.parse(raw.toString())
    return isMessage(value) ? value : null
  } catch {
    return null
  }
}

export const registerWs = (app: expressWs.Application, wss: WebSocketServer) => {
  app.ws('/', (ws) => {
    ws.on('message', (raw) => {
      const msg = parse(raw)
      if (!msg) return

      switch (msg.method) {
        case 'connection':
          connectionHandler(ws, msg, wss)
          break
        case 'draw':
          drawHandler(ws, msg, wss)
          break
      }
    })
  })
}
