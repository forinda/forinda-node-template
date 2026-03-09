import 'reflect-metadata'
import http from 'node:http'
import express, { type Express } from 'express'
import helmet from 'helmet'
import compression from 'compression'
import cors, { type CorsOptions } from 'cors'
import morgan from 'morgan'
import { Container } from './container'
import type { AppModuleClass } from './app-module'
import type { AppAdapter } from './adapters/adapter'
import { loadEnv } from './env'
import { createLogger } from './logger'
import { registerControllerForDocs, clearRegisteredRoutes } from './swagger'
import { getControllerPath } from './router-builder'

const log = createLogger('Application')

/**
 * Configuration options for bootstrapping the {@link Application}.
 */
export interface ApplicationOptions {
  /** The list of feature modules to load and register in the container. */
  modules: AppModuleClass[]
  /** Optional adapters (Socket.IO, Redis, etc.) that hook into the server lifecycle. */
  adapters?: AppAdapter[]
  /** The port number for the HTTP server. Falls back to the `PORT` environment variable. */
  port?: number
  /**
   * Global API prefix prepended to all module routes (e.g. `/api`).
   * Combined with versioning: `/{apiPrefix}/v{version}/{modulePath}`.
   * Defaults to `/api`.
   */
  apiPrefix?: string
  /**
   * Default API version applied to modules that don't specify their own.
   * Set to `1` by default. Routes become `/{apiPrefix}/v{version}/{path}`.
   */
  defaultVersion?: number
  /** CORS options. Pass `true` for permissive defaults, or a CorsOptions object. Defaults to enabled. */
  cors?: boolean | CorsOptions
  /** Enable helmet security headers. Defaults to `true`. */
  helmet?: boolean
  /** Enable gzip compression. Defaults to `true`. */
  compression?: boolean
  /** Morgan log format. Set to `false` to disable. Defaults to `'dev'` in development, `'combined'` in production. */
  morgan?: string | false
}

/**
 * The main application entry point that wires together Express, the DI container,
 * feature modules, and adapters. Manages the full server lifecycle from setup
 * through startup and graceful shutdown.
 *
 * @example
 * ```ts
 * const app = new Application({
 *   modules: [UserModule, OrderModule],
 *   adapters: [new SocketAdapter(), new SwaggerAdapter()],
 *   port: 3000,
 * });
 * app.start();
 * ```
 */
export class Application {
  /** The underlying Express application instance. */
  private app: Express
  /** The global dependency injection container. */
  private container: Container
  /** The raw Node.js HTTP server, created during {@link start}. */
  private httpServer: http.Server | null = null
  /** Adapters that hook into the application lifecycle. */
  private adapters: AppAdapter[]

  /**
   * Creates a new Application instance with the given options.
   *
   * @param options - The application configuration including modules, adapters, and port.
   */
  constructor(private readonly options: ApplicationOptions) {
    this.app = express()
    this.container = Container.getInstance()
    this.adapters = options.adapters ?? []
  }

  /**
   * Performs the full application setup sequence:
   * 1. Adapter `beforeMount` hooks (routes registered here bypass global middleware)
   * 2. Global middleware (helmet, cors, compression, morgan, json parser)
   * 3. Module registration & route mounting
   * 4. Health endpoint
   * 5. Adapter `beforeStart` hooks
   */
  private setup(): void {
    log.info('Bootstrapping application...')

    // 1. Adapter beforeMount hooks — routes registered here bypass global middleware
    //    (ideal for docs UIs that load CDN scripts blocked by helmet CSP)
    for (const adapter of this.adapters) {
      adapter.beforeMount?.(this.app, this.container)
    }

    // 2. Global middleware
    if (this.options.helmet !== false) {
      this.app.use(helmet())
    }
    if (this.options.cors !== false) {
      const corsOpts = typeof this.options.cors === 'object' ? this.options.cors : undefined
      this.app.use(cors(corsOpts))
    }
    if (this.options.compression !== false) {
      this.app.use(compression())
    }
    if (this.options.morgan !== false) {
      const fmt = typeof this.options.morgan === 'string' ? this.options.morgan : undefined
      this.app.use(morgan(fmt ?? (process.env.NODE_ENV === 'production' ? 'combined' : 'dev')))
    }
    this.app.use(express.json())

    // 3. Instantiate each module and run register()
    const modules = this.options.modules.map((ModuleClass) => {
      const mod = new ModuleClass()
      mod.register(this.container)
      return mod
    })

    // 4. Bootstrap @Configuration / @Bean factories
    this.container.bootstrap()

    // 5. Mount each module's routes with versioning
    const apiPrefix = this.options.apiPrefix ?? '/api'
    const defaultVersion = this.options.defaultVersion ?? 1

    clearRegisteredRoutes()

    for (const mod of modules) {
      const result = mod.routes()
      const routeSets = Array.isArray(result) ? result : [result]

      for (const route of routeSets) {
        const version = route.version ?? defaultVersion
        const mountPath = `${apiPrefix}/v${version}${route.path}`
        this.app.use(mountPath, route.router)
        log.info(`Mounted module routes: ${mountPath}`)

        // Register controller for OpenAPI docs introspection
        if (route.controller) {
          const controllerPrefix = getControllerPath(route.controller)
          const fullMount = mountPath + (controllerPrefix === '/' ? '' : controllerPrefix)
          registerControllerForDocs(route.controller, fullMount)
        }
      }
    }

    // 6. Default health endpoint
    this.app.get('/health', (_req, res) => {
      res.json({ status: 'ok' })
    })

    // 7. Global error handler — catches unhandled errors from routes/middleware
    //    so they return a 500 response instead of crashing the process
    this.app.use(
      (
        err: any,
        _req: express.Request,
        res: express.Response,
        _next: express.NextFunction,
      ) => {
        log.error(err, 'Unhandled request error')
        if (!res.headersSent) {
          res.status(err.status ?? 500).json({
            error: err.message ?? 'Internal server error',
          })
        }
      },
    )

    // 8. Adapter beforeStart hooks
    for (const adapter of this.adapters) {
      adapter.beforeStart?.(this.app, this.container)
    }
  }

  /**
   * Starts the HTTP server after loading environment variables and running setup.
   * Creates a raw `http.Server` so adapters (e.g., Socket.IO) can attach to it.
   */
  start(): void {
    const envConfig = loadEnv()
    this.setup()

    const port = this.options.port ?? envConfig.PORT

    // Create raw http.Server so adapters (Socket.IO, etc.) can attach to it
    this.httpServer = http.createServer(this.app)

    this.httpServer.listen(port, () => {
      log.info(`Server running on http://localhost:${port}`)

      // Adapter afterStart hooks (attach to the live http.Server)
      for (const adapter of this.adapters) {
        adapter.afterStart?.(this.httpServer!, this.container)
      }
    })
  }

  /**
   * Gracefully shuts down all adapters and closes the HTTP server.
   * Returns a promise that resolves once the server is fully closed.
   */
  shutdown(): Promise<void> {
    log.info('Shutting down...')
    return new Promise<void>((resolve) => {
      for (const adapter of this.adapters) {
        adapter.shutdown?.()
      }
      if (this.httpServer) {
        this.httpServer.close(() => resolve())
      } else {
        resolve()
      }
    })
  }

  /**
   * Returns the underlying Express application instance for advanced configuration.
   * @returns The Express app.
   */
  getExpressApp(): Express {
    return this.app
  }

  /**
   * Returns the raw Node.js HTTP server, or `null` if the server has not started yet.
   * @returns The HTTP server instance or `null`.
   */
  getHttpServer(): http.Server | null {
    return this.httpServer
  }
}
