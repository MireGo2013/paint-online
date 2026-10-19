import type { WebSocketServer } from 'ws'
import { broadcast } from '../broadcast.ts'
import type { DrawMessage, SessionSocket } from '../messages.ts'

export const drawHandler = (ws: SessionSocket, msg: DrawMessage, wss: WebSocketServer) => {
  // сессия берётся из соединения, а не из сообщения: рисовать можно только там, куда подключился
  if (!ws.id) return
  broadcast(wss, { ...msg, id: ws.id }, ws)
}
