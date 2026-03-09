import type http from 'node:http'
import { Server as SocketIOServer, type ServerOptions, type Socket } from 'socket.io'
import type { Container } from '../container'
import type { AppAdapter } from './adapter'
import { createLogger } from '../logger'

const log = createLogger('SocketAdapter')

/**
 * Callback invoked when a socket connects. Receives the individual socket
 * and the Socket.IO server instance for emitting events.
 *
 * @param socket - The newly connected client socket.
 * @param io - The Socket.IO server instance.
 */
export type SocketEventHandler = (socket: Socket, io: SocketIOServer) => void

/**
 * Configuration options for the {@link SocketAdapter}.
 */
export interface SocketAdapterOptions {
  /** Socket.IO server options (cors, path, transports, etc.). */
  serverOptions?: Partial<ServerOptions>
  /** A map of namespace paths to their connection handlers. */
  namespaces?: Record<string, SocketEventHandler>
  /** Handler invoked when a client connects to the default namespace. */
  onConnection?: SocketEventHandler
}

/**
 * DI token for injecting the Socket.IO server instance into any service.
 *
 * @example
 * ```ts
 * constructor(@Inject(SOCKET_IO) private io: SocketIOServer) {}
 * ```
 */
export const SOCKET_IO = Symbol('SocketIO')

/**
 * Application adapter that integrates Socket.IO with the HTTP server.
 * Attaches the Socket.IO server after the HTTP server starts listening,
 * registers it in the DI container, and sets up namespace/connection handlers.
 *
 * @example
 * ```ts
 * new Application({
 *   modules: [...],
 *   adapters: [
 *     new SocketAdapter({
 *       onConnection: (socket, io) => {
 *         socket.on('chat', (msg) => io.emit('chat', msg));
 *       },
 *     }),
 *   ],
 * });
 * ```
 */
export class SocketAdapter implements AppAdapter {
  /** The Socket.IO server instance, created in {@link afterStart}. */
  private io: SocketIOServer | null = null

  /**
   * Creates a new SocketAdapter with the given options.
   * @param options - Socket.IO configuration and event handlers.
   */
  constructor(private readonly options: SocketAdapterOptions = {}) {}

  /**
   * Called after the HTTP server is listening. Creates the Socket.IO server,
   * registers it in the DI container, and attaches connection handlers.
   *
   * @param server - The raw Node.js HTTP server to attach Socket.IO to.
   * @param container - The DI container for registering the Socket.IO instance.
   */
  afterStart(server: http.Server, container: Container): void {
    this.io = new SocketIOServer(server, {
      cors: { origin: '*' },
      ...this.options.serverOptions,
    })

    // Register in container so any @Service can inject it
    container.registerInstance(SOCKET_IO, this.io)

    // Default namespace
    if (this.options.onConnection) {
      const handler = this.options.onConnection
      this.io.on('connection', (socket) => {
        handler(socket, this.io!)
      })
    }

    // Custom namespaces
    if (this.options.namespaces) {
      for (const [ns, handler] of Object.entries(this.options.namespaces)) {
        this.io.of(ns).on('connection', (socket) => {
          handler(socket, this.io!)
        })
      }
    }

    log.info('Socket.IO adapter attached')
  }

  /**
   * Closes the Socket.IO server and disconnects all clients.
   */
  shutdown(): void {
    this.io?.close()
  }
}
