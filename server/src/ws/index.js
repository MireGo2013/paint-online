import { connectionHandler } from './handlers/connection.js'
import { drawHandler } from './handlers/draw.js'

const parse = (raw) => {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export const registerWs = (app, wss) => {
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
