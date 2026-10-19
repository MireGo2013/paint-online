import type { WebSocketServer } from 'ws'
import { broadcast } from '../broadcast.ts'
import type { ConnectionMessage, SessionSocket } from '../messages.ts'

export const connectionHandler = (ws: SessionSocket, msg: ConnectionMessage, wss: WebSocketServer) => {
  ws.id = msg.id
  broadcast(wss, msg)
}
