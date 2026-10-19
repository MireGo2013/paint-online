import { mkdir } from 'node:fs/promises'
import { createApp } from './app.js'
import { FILES_DIR, PORT } from './config.js'

await mkdir(FILES_DIR, { recursive: true })

const app = createApp()

app.listen(PORT, () => console.log(`server started on PORT ${PORT}`))
