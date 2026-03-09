import { loadEnv, type Env } from './env'

/**
 * Injectable configuration service providing typed access to environment
 * variables validated by the Zod env schema.
 *
 * Registered in the DI container as a singleton during bootstrap.
 * Inject via `@Autowired()` in any service or controller.
 *
 * @example
 * ```ts
 * @Service()
 * class PaymentService {
 *   @Autowired() private config!: ConfigService
 *
 *   connect() {
 *     const port = this.config.get('REDIS_PORT')  // typed as number
 *     const env = this.config.get('NODE_ENV')      // typed as 'development' | 'production' | 'test'
 *   }
 * }
 * ```
 */
export class ConfigService {
  private readonly env: Env

  constructor() {
    this.env = loadEnv()
  }

  /**
   * Get a typed environment variable by key.
   *
   * @param key - The environment variable name.
   * @returns The validated value with its inferred type.
   */
  get<K extends keyof Env>(key: K): Env[K] {
    return this.env[key]
  }

  /**
   * Get all validated environment variables.
   * @returns A read-only copy of the full env config.
   */
  getAll(): Readonly<Env> {
    return this.env
  }

  /** Check if the app is running in production. */
  isProduction(): boolean {
    return this.env.NODE_ENV === 'production'
  }

  /** Check if the app is running in development. */
  isDevelopment(): boolean {
    return this.env.NODE_ENV === 'development'
  }

  /** Check if the app is running in test mode. */
  isTest(): boolean {
    return this.env.NODE_ENV === 'test'
  }
}
