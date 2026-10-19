import express from 'express'
import expressWs from 'express-ws'
import cors from 'cors'
import { imageRouter } from './routes/image.js'
import { registerWs } from './ws/index.js'

export const createApp = () => {
  const app = express()
  const wss = expressWs(app).getWss()

  app.use(cors())
  app.use(express.json())

  app.use(imageRouter)
  registerWs(app, wss)

  return app
}
