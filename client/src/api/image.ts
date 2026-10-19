import { API_URL } from '../config.ts'

const imageUrl = (sessionId: string) => `${API_URL}/image?id=${encodeURIComponent(sessionId)}`

const toBlob = (canvas: HTMLCanvasElement) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))

export const saveImage = async (sessionId: string, canvas: HTMLCanvasElement) => {
  const blob = await toBlob(canvas)
  if (!blob) return

  const res = await fetch(imageUrl(sessionId), {
    method: 'POST',
    headers: { 'Content-Type': 'image/png' },
    body: blob,
  })
  if (!res.ok) throw new Error(`Не удалось сохранить рисунок: HTTP ${res.status}`)
}

export const loadImage = async (sessionId: string) => {
  const res = await fetch(imageUrl(sessionId), { cache: 'no-store' })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Не удалось загрузить рисунок: HTTP ${res.status}`)

  return createImageBitmap(await res.blob())
}
