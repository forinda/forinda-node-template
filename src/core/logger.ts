import pino, { type Logger as PinoLogger } from 'pino'

const isDev = () => process.env.NODE_ENV !== 'production'

/** Root pino instance. All child loggers inherit from this. */
const root = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  ...(isDev()
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss',
            ignore: 'pid,hostname',
          },
        },
      }
    : {}),
})

/**
 * Creates a named child logger. Each module/service should create its own
 * logger with a descriptive name so log output is easy to filter and trace.
 *
 * @param name - A short identifier for the component (e.g. 'UserService', 'RedisAdapter').
 * @returns A pino child logger tagged with the given name.
 *
 * @example
 * ```ts
 * const log = createLogger('UserService')
 * log.info('User created', { userId: '123' })
 * ```
 */
export function createLogger(name: string) {
  return root.child({ name })
}

/** The root logger instance. Prefer `createLogger(name)` for component-level logging. */
export const logger = root

/**
 * Injectable logger that can be injected via `@Autowired()` into any service.
 * Uses `child(name)` to create a named child logger for the current component.
 *
 * Registered in the DI container as a transient (new instance per injection)
 * via `Container.bootstrap()` to avoid circular dependency with decorators.
 *
 * @example
 * ```ts
 * @Service()
 * class UserService {
 *   @Autowired() private logger!: Logger
 *
 *   doSomething() {
 *     const log = this.logger.child('UserService')
 *     log.info('doing something')
 *   }
 * }
 * ```
 */
export class Logger {
  private log: PinoLogger = root

  /** Create a named child logger. */
  child(name: string): Logger {
    const instance = new Logger()
    instance.log = root.child({ name })
    return instance
  }

  /** Log at info level. */
  info(msg: string, ...args: any[]): void {
    this.log.info(args.length ? args[0] : {}, msg)
  }

  /** Log at warn level. */
  warn(msg: string, ...args: any[]): void {
    this.log.warn(args.length ? args[0] : {}, msg)
  }

  /** Log at error level. */
  error(msg: string, ...args: any[]): void {
    this.log.error(args.length ? args[0] : {}, msg)
  }

  /** Log at debug level. */
  debug(msg: string, ...args: any[]): void {
    this.log.debug(args.length ? args[0] : {}, msg)
  }

  /** Log at trace level. */
  trace(msg: string, ...args: any[]): void {
    this.log.trace(args.length ? args[0] : {}, msg)
  }

  /** Log at fatal level. */
  fatal(msg: string, ...args: any[]): void {
    this.log.fatal(args.length ? args[0] : {}, msg)
  }
}
