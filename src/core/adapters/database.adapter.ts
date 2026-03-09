import type { Express } from 'express'
import type { Container } from '../container'
import type { AppAdapter } from './adapter'
import { TRANSACTION_MANAGER } from '../interfaces'
import { DatabaseService, type DatabaseOptions } from '../services/database.service'
import { createLogger } from '../logger'

const log = createLogger('DatabaseAdapter')

/** DI token for the DatabaseService. */
export const DATABASE = Symbol('Database')

/**
 * Adapter that initializes a Drizzle ORM connection to PostgreSQL and
 * registers the {@link DatabaseService} in the DI container.
 *
 * Pass your Drizzle schema for fully type-safe queries.
 * The service is available for injection via `@Autowired()` or
 * `@Inject(DATABASE)` after the adapter runs.
 *
 * @example
 * ```ts
 * import * as schema from '@/db/schema'
 *
 * const app = new Application({
 *   modules: [UserModule],
 *   adapters: [
 *     new DatabaseAdapter({ url: env.DATABASE_URL!, schema }),
 *   ],
 * });
 * ```
 */
export class DatabaseAdapter<
  TSchema extends Record<string, unknown> = Record<string, never>,
> implements AppAdapter {
  private service: DatabaseService<TSchema> | null = null
  private readonly opts: DatabaseOptions<TSchema>

  constructor(options: DatabaseOptions<TSchema>) {
    this.opts = options
  }

  beforeMount(_app: Express, container: Container): void {
    this.service = new DatabaseService(this.opts)

    // Register both by class and by symbol token
    container.registerInstance(DatabaseService, this.service)
    container.registerInstance(DATABASE, this.service)

    // Register TransactionManager for @Transactional() decorator support
    container.registerInstance(TRANSACTION_MANAGER, this.service.createTransactionManager())

    log.info('DatabaseService registered in container')
  }

  async shutdown(): Promise<void> {
    if (this.service) {
      await this.service.shutdown()
    }
  }
}
