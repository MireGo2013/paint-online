export const broadcast = (wss, msg, except = null) => {
  wss.clients.forEach((client) => {
    if (client !== except && client.id === msg.id) {
      client.send(JSON.stringify(msg))
    }
  })
}
