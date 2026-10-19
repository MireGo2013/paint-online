import { useEffect } from 'react'
import canvasState from '../store/canvasState.ts'
import { drawFigure } from '../tools/drawFigure.ts'
import { WS_URL } from '../config.ts'
import { parseMessage, sendMessage } from '../ws/socket.ts'

export const useSessionSocket = (sessionId: string | undefined, username: string) => {
  useEffect(() => {
    if (!sessionId || !username) return

    const socket = new WebSocket(WS_URL)
    canvasState.setSocket(socket)

    socket.onopen = () => {
      console.log('Подключение установлено')
      sendMessage(socket, { method: 'connection', id: sessionId, username })
    }

    socket.onmessage = (event) => {
      const msg = parseMessage(event.data)
      if (!msg) return

      switch (msg.method) {
        case 'connection':
          console.log(`Пользователь ${msg.username} присоединился`)
          break
        case 'draw': {
          const ctx = canvasState.ctx
          if (ctx) drawFigure(ctx, msg.figure)
          break
        }
      }
    }

    socket.onclose = () => console.log('Соединение закрыто')

    return () => {
      socket.close()
      canvasState.setSocket(null)
    }
  }, [sessionId, username])
}
