import type http from 'node:http'
import type { Express } from 'express'
import type { Container } from '../container'

/**
 * Adapters plug into the Application lifecycle.
 * Implement this to add WebSocket, gRPC, message queues, etc.
 */
export interface AppAdapter {
  /**
   * Called before global middleware (helmet, cors, etc.) is applied.
   * Routes registered here bypass security middleware — ideal for
   * serving documentation UIs that load CDN scripts.
   */
  beforeMount?(app: Express, container: Container): void

  /** Called after middleware and module routes are registered, before the HTTP server starts. */
  beforeStart?(app: Express, container: Container): void

  /** Called after the HTTP server is listening — attach to the raw http.Server. */
  afterStart?(server: http.Server, container: Container): void

  /** Called on shutdown — clean up connections. */
  shutdown?(): void | Promise<void>
}

/** Constructor type for classes that implement {@link AppAdapter}. */
export type AppAdapterClass = new () => AppAdapter
