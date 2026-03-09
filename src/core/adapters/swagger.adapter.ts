import type { Express } from 'express'
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
 * Adapter that auto-generates OpenAPI 3.0 documentation from route decorators
 * and Zod validation schemas, then serves Swagger UI and ReDoc endpoints.
 *
 * Introspects all controllers registered via `ModuleRoutes.controller` to
 * build the spec — no manual route definitions needed (like Django REST).
 *
 * Override or enrich the generated docs with `@ApiOperation`, `@ApiResponse`,
 * `@ApiTags`, and `@ApiExclude` decorators on controllers/methods.
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
 * // Swagger UI  → http://localhost:3000/docs
 * // ReDoc       → http://localhost:3000/redoc
 * // OpenAPI JSON → http://localhost:3000/openapi.json
 * ```
 */
export class SwaggerAdapter implements AppAdapter {
  private readonly opts: SwaggerAdapterOptions

  constructor(options: SwaggerAdapterOptions = {}) {
    this.opts = options
  }

  beforeStart(app: Express, _container: Container): void {
    const specPath = this.opts.specPath ?? '/openapi.json'
    const docsPath = this.opts.docsPath ?? '/docs'
    const redocPath = this.opts.redocPath ?? '/redoc'

    // Serve the OpenAPI JSON spec (regenerated on each request for HMR compat)
    app.get(specPath, (_req, res) => {
      res.json(buildOpenAPISpec(this.opts))
    })

    // Serve Swagger UI
    app.get(docsPath, (_req, res) => {
      res.contentType('text/html').send(swaggerUIHtml(specPath, this.opts.info?.title))
    })

    // Serve ReDoc
    app.get(redocPath, (_req, res) => {
      res.contentType('text/html').send(redocHtml(specPath, this.opts.info?.title))
    })

    log.info(`Swagger UI:   ${docsPath}`)
    log.info(`ReDoc:        ${redocPath}`)
    log.info(`OpenAPI spec: ${specPath}`)
  }
}
