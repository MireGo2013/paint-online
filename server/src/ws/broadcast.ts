import type { WebSocketServer } from 'ws'
import type { Message, SessionSocket } from './messages.ts'

export const broadcast = (wss: WebSocketServer, msg: Message, except: SessionSocket | null = null) => {
  wss.clients.forEach((client: SessionSocket) => {
    if (client !== except && client.id === msg.id) {
      client.send(JSON.stringify(msg))
    }
  })
}
