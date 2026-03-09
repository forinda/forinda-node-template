import { SocketAdapter, createLogger } from '@/core'

const log = createLogger('Socket')

export const socketAdapter = new SocketAdapter({
  onConnection: (socket, _io) => {
    log.info(`Client connected: ${socket.id}`)

    socket.on('ping', (data) => {
      socket.emit('pong', { received: data, timestamp: Date.now() })
    })

    socket.on('disconnect', () => {
      log.info(`Client disconnected: ${socket.id}`)
    })
  },

  // Add namespaced handlers here:
  // namespaces: {
  //   '/chat': (socket, io) => { ... },
  //   '/notifications': (socket, io) => { ... },
  // },
})
