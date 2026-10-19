import { broadcast } from '../broadcast.js'

export const drawHandler = (ws, msg, wss) => {
  // сессия берётся из соединения, а не из сообщения: рисовать можно только там, куда подключился
  if (!ws.id) return
  broadcast(wss, { ...msg, id: ws.id }, ws)
}
