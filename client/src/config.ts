// hostname страницы, а не localhost: с другого устройства в сети localhost — это само устройство
const SERVER_HOST = `${location.hostname}:5000`

export const API_URL = `http://${SERVER_HOST}`
export const WS_URL = `ws://${SERVER_HOST}/`
