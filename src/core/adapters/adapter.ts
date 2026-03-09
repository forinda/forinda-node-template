import type http from 'node:http'
import type { Express } from 'express'
import type { Container } from '../container'

/**
 * Adapters plug into the Application lifecycle.
 * Implement this to add WebSocket, gRPC, message queues, etc.
 */
export interface AppAdapter {
  /** Called before the HTTP server starts — attach to Express or register DI bindings. */
  beforeStart?(app: Express, container: Container): void

  /** Called after the HTTP server is listening — attach to the raw http.Server. */
  afterStart?(server: http.Server, container: Container): void

  /** Called on shutdown — clean up connections. */
  shutdown?(): void | Promise<void>
}

/** Constructor type for classes that implement {@link AppAdapter}. */
export type AppAdapterClass = new () => AppAdapter
