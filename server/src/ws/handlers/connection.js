import { broadcast } from '../broadcast.js'

export const connectionHandler = (ws, msg, wss) => {
  ws.id = msg.id
  broadcast(wss, msg)
}
