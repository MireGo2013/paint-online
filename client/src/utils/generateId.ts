// crypto.randomUUID есть только в безопасном контексте (https или localhost).
// По адресу в локальной сети (http://192.168...) берём случайные байты напрямую.
export const generateId = () => {
  if (window.isSecureContext) return crypto.randomUUID()

  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}
