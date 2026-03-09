import { AsyncLocalStorage } from 'node:async_hooks'
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type { ExtractTablesWithRelations } from 'drizzle-orm'
import type { PgTransaction, PgQueryResultHKT } from 'drizzle-orm/pg-core'
import postgres from 'postgres'
import { createLogger } from '../logger'
import type { TransactionManager } from '../interfaces'

const log = createLogger('DatabaseService')

/** Type alias for a Drizzle PG transaction scoped to a schema. */
export type DrizzleTransaction<TSchema extends Record<string, unknown> = Record<string, never>> =
  PgTransaction<PgQueryResultHKT, TSchema, ExtractTablesWithRelations<TSchema>>

/**
 * Options for configuring the database connection.
 */
export interface DatabaseOptions<TSchema extends Record<string, unknown> = Record<string, never>> {
  /** PostgreSQL connection URL. */
  url: string
  /** Drizzle schema object for type-safe queries. */
  schema?: TSchema
  /** Maximum number of connections in the pool. Defaults to `10`. */
  maxConnections?: number
  /** Enable query logging. Defaults to `false`. */
  logging?: boolean
}

/** Global transaction store shared across the DatabaseService instance. */
const txStore = new AsyncLocalStorage<{ tx: unknown }>()

/**
 * Injectable service that manages a Drizzle ORM connection to PostgreSQL.
 *
 * Use `.active` in repositories for automatic transaction propagation — it
 * returns the current transaction if inside a `@Transactional()` or
 * `.transaction()` scope, or the base `db` instance otherwise.
 *
 * @example
 * ```ts
 * // In a repository — uses transaction automatically when called
 * // from a @Transactional() use-case method:
 * @Repository()
 * class UserRepository {
 *   @Autowired() private database!: DatabaseService
 *
 *   async findAll() {
 *     return this.database.active.select().from(users)
 *   }
 *
 *   async create(data: NewUser) {
 *     const [user] = await this.database.active.insert(users).values(data).returning()
 *     return user
 *   }
 * }
 *
 * // In a use-case — repos automatically join this transaction:
 * @Service()
 * class RegisterUseCase {
 *   @Transactional()
 *   async execute(dto: RegisterDTO) {
 *     const user = await this.userRepo.create(dto)
 *     await this.profileRepo.create(user.id)
 *     return user
 *   }
 * }
 * ```
 */
export class DatabaseService<TSchema extends Record<string, unknown> = Record<string, never>> {
  /** The Drizzle ORM instance for type-safe queries. */
  readonly db: PostgresJsDatabase<TSchema>
  /** The underlying postgres.js client for raw queries or shutdown. */
  readonly client: postgres.Sql

  constructor(options: DatabaseOptions<TSchema>) {
    this.client = postgres(options.url, {
      max: options.maxConnections ?? 10,
      onnotice: () => {},
    })

    this.db = drizzle(this.client, {
      schema: options.schema,
      logger: options.logging ?? false,
    })

    log.info('Database connection initialized')
  }

  /**
   * Returns the active transaction if inside a `@Transactional()` or
   * `.transaction()` scope, or the base `db` instance otherwise.
   *
   * Use this in all repository methods for transparent transaction propagation.
   */
  get active(): PostgresJsDatabase<TSchema> | DrizzleTransaction<TSchema> {
    const store = txStore.getStore()
    return (store?.tx as DrizzleTransaction<TSchema>) ?? this.db
  }

  /**
   * Runs a callback inside a database transaction. The transaction is
   * propagated via AsyncLocalStorage so `.active` calls inside the
   * callback (including nested repository methods) join the same tx.
   *
   * @example
   * ```ts
   * await db.transaction(async (tx) => {
   *   await tx.insert(users).values({ ... })
   *   await tx.insert(userProfiles).values({ ... })
   * })
   * ```
   */
  async transaction<T>(fn: (tx: DrizzleTransaction<TSchema>) => Promise<T>): Promise<T> {
    return this.db.transaction(async (tx) => {
      return txStore.run({ tx }, () => fn(tx as DrizzleTransaction<TSchema>))
    }) as Promise<T>
  }

  /**
   * Creates a {@link TransactionManager} compatible with the `@Transactional()` decorator.
   * The transaction is automatically propagated to all repositories using `.active`.
   */
  createTransactionManager(): TransactionManager<DrizzleTransaction<TSchema>> {
    return new DrizzleTransactionManager(this)
  }

  /**
   * Closes the database connection pool gracefully.
   */
  async shutdown(): Promise<void> {
    await this.client.end()
    log.info('Database connection closed')
  }
}

/**
 * Bridges Drizzle's transaction API to the framework's `@Transactional()` decorator.
 * Uses AsyncLocalStorage so repositories calling `.active` transparently join the tx.
 * Registered automatically by `DatabaseAdapter` under the `TRANSACTION_MANAGER` token.
 */
export class DrizzleTransactionManager<
  TSchema extends Record<string, unknown> = Record<string, never>,
> implements TransactionManager<DrizzleTransaction<TSchema>>
{
  private pending = new Map<symbol, { resolve: (v: void) => void; reject: (e: Error) => void }>()

  constructor(private readonly database: DatabaseService<TSchema>) {}

  async begin(): Promise<DrizzleTransaction<TSchema>> {
    const id = Symbol('tx')

    const txPromise = new Promise<DrizzleTransaction<TSchema>>((resolveTx) => {
      const outerPromise = this.database.db.transaction(async (tx) => {
        // Store tx in AsyncLocalStorage so .active picks it up
        txStore.enterWith({ tx })
        resolveTx(tx as DrizzleTransaction<TSchema>)
        return new Promise<void>((resolve, reject) => {
          this.pending.set(id, { resolve, reject })
        })
      }) as unknown as Promise<void>

      const rec = id as unknown as Record<string, Promise<void>>
      rec.__outer = outerPromise
    })

    const tx = await txPromise
    const rec = tx as unknown as Record<string | symbol, unknown>
    rec.__txId = id
    rec.__outer = (id as unknown as Record<string, Promise<void>>).__outer
    return tx
  }

  async commit(tx: DrizzleTransaction<TSchema>): Promise<void> {
    const rec = tx as unknown as Record<string | symbol, unknown>
    const id = rec.__txId as symbol
    const outer = rec.__outer as Promise<void>
    const p = this.pending.get(id)
    if (p) {
      this.pending.delete(id)
      p.resolve()
      await outer
    }
  }

  async rollback(tx: DrizzleTransaction<TSchema>): Promise<void> {
    const rec = tx as unknown as Record<string | symbol, unknown>
    const id = rec.__txId as symbol
    const outer = rec.__outer as Promise<void>
    const p = this.pending.get(id)
    if (p) {
      this.pending.delete(id)
      p.reject(new Error('Transaction rolled back'))
      try {
        await outer
      } catch {
        // Expected — rollback triggers rejection
      }
    }
  }
}
