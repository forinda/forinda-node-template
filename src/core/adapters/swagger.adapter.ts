import helmet from 'helmet'
import { Router, type Express } from 'express'
import type { Container } from '../container'
import type { AppAdapter } from './adapter'
import { buildOpenAPISpec, swaggerUIHtml, redocHtml, type SwaggerOptions } from '../swagger'
import { createLogger } from '../logger'

const log = createLogger('SwaggerAdapter')

/**
 * Options for the {@link SwaggerAdapter}.
 */
export interface SwaggerAdapterOptions extends SwaggerOptions {
  /** Path to serve the Swagger UI. Defaults to `/docs`. */
  docsPath?: string
  /** Path to serve the ReDoc UI. Defaults to `/redoc`. */
  redocPath?: string
  /** Path to serve the raw OpenAPI JSON spec. Defaults to `/openapi.json`. */
  specPath?: string
}

/**
 * Relaxed CSP middleware that allows CDN scripts needed by Swagger UI and ReDoc.
 */
const docsCSP = helmet.contentSecurityPolicy({
  useDefaults: true,
  directives: {
    'script-src': [
      "'self'",
      "'unsafe-inline'",
      'https://unpkg.com',
      'https://cdn.redoc.ly',
      'https://cdn.jsdelivr.net',
    ],
    'style-src': ["'self'", "'unsafe-inline'", 'https://unpkg.com', 'https://fonts.googleapis.com'],
    'font-src': ["'self'", 'https://fonts.gstatic.com'],
    'img-src': ["'self'", 'data:', 'https://redocly.com'],
    'worker-src': ["'self'", 'blob:'],
  },
})

/**
 * Adapter that auto-generates OpenAPI 3.0 documentation from route decorators
 * and Zod validation schemas, then serves Swagger UI and ReDoc endpoints.
 *
 * Uses a relaxed Content Security Policy on docs routes so CDN scripts
 * (Swagger UI, ReDoc) load without being blocked by helmet.
 *
 * @example
 * ```ts
 * const app = new Application({
 *   modules: [UserModule, ProductModule],
 *   adapters: [
 *     new SwaggerAdapter({
 *       info: { title: 'My API', version: '2.0.0' },
 *     }),
 *   ],
 * });
 * // Swagger UI   → http://localhost:3000/docs
 * // ReDoc        → http://localhost:3000/redoc
 * // OpenAPI JSON → http://localhost:3000/openapi.json
 * ```
 */
export class SwaggerAdapter implements AppAdapter {
  private readonly opts: SwaggerAdapterOptions

  constructor(options: SwaggerAdapterOptions = {}) {
    this.opts = options
  }

  beforeMount(app: Express, _container: Container): void {
    const specPath = this.opts.specPath ?? '/openapi.json'
    const docsPath = this.opts.docsPath ?? '/docs'
    const redocPath = this.opts.redocPath ?? '/redoc'

    // Dedicated router with relaxed CSP for docs routes
    const docsRouter = Router()
    docsRouter.use(docsCSP)

    docsRouter.get(specPath, (_req, res) => {
      res.json(buildOpenAPISpec(this.opts))
    })

    docsRouter.get(docsPath, (_req, res) => {
      res.contentType('text/html').send(swaggerUIHtml(specPath, this.opts.info?.title))
    })

    docsRouter.get(redocPath, (_req, res) => {
      res.contentType('text/html').send(redocHtml(specPath, this.opts.info?.title))
    })

    app.use(docsRouter)

    log.info(`Swagger UI:   ${docsPath}`)
    log.info(`ReDoc:        ${redocPath}`)
    log.info(`OpenAPI spec: ${specPath}`)
  }
}
