import express from 'express'
import path from 'node:path'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { FILES_DIR } from '../config.ts'

const ID_RE = /^[\w-]{1,64}$/
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

const filePath = (id: string) => path.join(FILES_DIR, `${id}.png`)

const isValidId = (id: unknown): id is string => typeof id === 'string' && ID_RE.test(id)

const isNotFound = (e: unknown) => e instanceof Error && 'code' in e && e.code === 'ENOENT'

export const imageRouter = express.Router()

imageRouter.post('/image', express.raw({ type: 'image/png', limit: '5mb' }), async (req, res) => {
  const { id } = req.query
  if (!isValidId(id)) return res.status(400).json({ message: 'Некорректный id' })

  const body: unknown = req.body
  if (!Buffer.isBuffer(body) || !body.subarray(0, 8).equals(PNG_SIGNATURE)) {
    return res.status(400).json({ message: 'Ожидается PNG' })
  }

  await mkdir(FILES_DIR, { recursive: true })
  await writeFile(filePath(id), body)
  res.sendStatus(204)
})

imageRouter.get('/image', async (req, res) => {
  const { id } = req.query
  if (!isValidId(id)) return res.status(400).json({ message: 'Некорректный id' })

  try {
    const data = await readFile(filePath(id))
    res.type('png').send(data)
  } catch (e) {
    if (isNotFound(e)) return res.sendStatus(404)
    throw e
  }
})
