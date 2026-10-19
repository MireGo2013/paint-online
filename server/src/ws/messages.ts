import type { WebSocket } from 'ws'

export type ConnectionMessage = {
  method: 'connection'
  id: string
  username: string
}

// фигуру сервер не разбирает, а только пересылает
export type DrawMessage = {
  method: 'draw'
  id: string
  figure: unknown
}

export type Message = ConnectionMessage | DrawMessage

// соединение с меткой сессии, которую ставит обработчик connection
export type SessionSocket = WebSocket & { id?: string }

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

export const isMessage = (value: unknown): value is Message => {
  if (!isObject(value) || typeof value.id !== 'string') return false

  switch (value.method) {
    case 'connection':
      return typeof value.username === 'string'
    case 'draw':
      return isObject(value.figure)
    default:
      return false
  }
}
