import type { Message } from './messages.ts'

export const sendMessage = (socket: WebSocket, msg: Message) => {
  socket.send(JSON.stringify(msg))
}

export const parseMessage = (data: unknown): Message | null => {
  if (typeof data !== 'string') return null
  try {
    return JSON.parse(data) as Message
  } catch {
    return null
  }
}
