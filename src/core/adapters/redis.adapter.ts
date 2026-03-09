import Redis, { type RedisOptions } from 'ioredis'
import type { Express } from 'express'
import type { Container } from '../container'
import type { AppAdapter } from './adapter'
import { createLogger } from '../logger'

const log = createLogger('RedisAdapter')

/**
 * Configuration options for the {@link RedisAdapter}.
 */
export interface RedisAdapterOptions {
  /** ioredis connection options object or a `redis://` URL string. */
  connection?: RedisOptions | string
  /** Callback invoked when the Redis connection is ready. */
  onReady?: (redis: Redis) => void
  /** Callback invoked on Redis connection errors. Falls back to the logger if not provided. */
  onError?: (err: Error) => void
  /** Whether to create a dedicated subscriber client for pub/sub (requires a separate connection). */
  enableSubscriber?: boolean
}

/**
 * DI token for injecting the main Redis client into any service.
 *
 * @example
 * ```ts
 * constructor(@Inject(REDIS) private redis: Redis) {}
 * ```
 */
export const REDIS = Symbol('Redis')

/**
 * DI token for injecting the dedicated Redis subscriber client into any service.
 * Only available when `enableSubscriber` is `true` in {@link RedisAdapterOptions}.
 *
 * @example
 * ```ts
 * constructor(@Inject(REDIS_SUBSCRIBER) private subscriber: Redis) {}
 * ```
 */
export const REDIS_SUBSCRIBER = Symbol('RedisSubscriber')

/**
 * Application adapter that integrates Redis (via ioredis) into the server lifecycle.
 * Creates a main Redis client and optionally a dedicated subscriber client for pub/sub.
 * Both clients are registered in the DI container for injection into services.
 *
 * @example
 * ```ts
 * new Application({
 *   modules: [...],
 *   adapters: [
 *     new RedisAdapter({
 *       connection: { host: '127.0.0.1', port: 6379 },
 *       enableSubscriber: true,
 *     }),
 *   ],
 * });
 * ```
 */
export class RedisAdapter implements AppAdapter {
  /** The main Redis client for commands. */
  private client: Redis | null = null
  /** The dedicated subscriber client for pub/sub, if enabled. */
  private subscriber: Redis | null = null

  /**
   * Creates a new RedisAdapter with the given options.
   * @param options - Redis connection and behavior configuration.
   */
  constructor(private readonly options: RedisAdapterOptions = {}) {}

  /**
   * Called before the HTTP server starts. Creates Redis client(s), attaches
   * event handlers, and registers them in the DI container.
   *
   * @param _app - The Express application (unused by this adapter).
   * @param container - The DI container for registering Redis instances.
   */
  beforeStart(_app: Express, container: Container): void {
    const connOpts = this.options.connection ?? {}

    // Main client
    this.client = typeof connOpts === 'string' ? new Redis(connOpts) : new Redis(connOpts)

    this.client.on('ready', () => {
      log.info('Redis adapter connected')
      this.options.onReady?.(this.client!)
    })

    this.client.on('error', (err) => {
      if (this.options.onError) {
        this.options.onError(err)
      } else {
        log.error(`Redis error: ${err.message}`)
      }
    })

    container.registerInstance(REDIS, this.client)

    // Dedicated subscriber (pub/sub needs a separate connection)
    if (this.options.enableSubscriber) {
      this.subscriber = typeof connOpts === 'string' ? new Redis(connOpts) : new Redis(connOpts)

      this.subscriber.on('error', (err) => {
        log.error(`Redis subscriber error: ${err.message}`)
      })

      container.registerInstance(REDIS_SUBSCRIBER, this.subscriber)
    }
  }

  /**
   * Gracefully closes both the subscriber and main Redis connections.
   */
  async shutdown(): Promise<void> {
    await this.subscriber?.quit()
    await this.client?.quit()
  }
}
