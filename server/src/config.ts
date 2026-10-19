import path from 'node:path'

export const PORT = Number(process.env.PORT) || 5000
export const FILES_DIR = path.join(import.meta.dirname, '..', 'files')
