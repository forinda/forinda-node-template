import crypto from 'node:crypto'
import type { RequestContext } from '../context'
import type { MiddlewareHandler } from '../decorators'
import { createLogger } from '../logger'

const log = createLogger('CsrfMiddleware')

/**
 * Configuration for the CSRF double-submit token middleware.
 */
export interface CsrfOptions {
  /**
   * Name of the HTTP header the client must send with the token.
   * Default: `'x-csrf-token'`.
   */
  headerName?: string
  /**
   * Name of the cookie that stores the CSRF token.
   * Default: `'csrf-token'`.
   */
  cookieName?: string
  /**
   * Cookie options.
   */
  cookie?: {
    /** Mark the cookie as HTTP-only. Default `false` (client JS needs to read it). */
    httpOnly?: boolean
    /** Mark the cookie as Secure (HTTPS only). Default `true`. */
    secure?: boolean
    /** SameSite attribute. Default `'strict'`. */
    sameSite?: 'strict' | 'lax' | 'none'
    /** Cookie path. Default `'/'`. */
    path?: string
    /** Max-age in seconds. Default `86400` (24 hours). */
    maxAge?: number
  }
  /**
   * HTTP methods that are exempt from CSRF validation.
   * Default: `['GET', 'HEAD', 'OPTIONS']`.
   */
  ignoreMethods?: string[]
  /**
   * Token byte length (before hex encoding). Default `32`.
   */
  tokenLength?: number
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

/**
 * Generate a cryptographically random CSRF token.
 */
function generateToken(length: number): string {
  return crypto.randomBytes(length).toString('hex')
}

/**
 * Creates a CSRF double-submit cookie middleware.
 *
 * **How it works:**
 * 1. On every request, if no CSRF cookie exists, one is set with a random token.
 * 2. On state-changing requests (POST, PUT, DELETE, PATCH), the middleware
 *    checks that the `x-csrf-token` header matches the cookie value.
 * 3. If they don't match, a `403 Forbidden` response is returned.
 *
 * **Frontend integration:**
 * - Read the CSRF token from the cookie (it's not httpOnly by default).
 * - Send it back on every mutating request as the `X-CSRF-Token` header.
 *
 * **When to use:**
 * Only needed when your API is consumed by browsers with cookie-based sessions.
 * Pure JWT (Authorization header) APIs don't need CSRF because browsers don't
 * automatically attach the Authorization header on cross-origin requests.
 *
 * @example
 * ```ts
 * // Apply to specific routes that use cookie auth
 * @Controller('/settings')
 * class SettingsController {
 *   @Post('/')
 *   @Middleware(csrf())
 *   async update(ctx: RequestContext) { ... }
 * }
 *
 * // Or apply globally via the Application options
 * // (only useful if you have cookie-based auth)
 * ```
 */
export function csrf(options: CsrfOptions = {}): MiddlewareHandler {
  const headerName = (options.headerName ?? 'x-csrf-token').toLowerCase()
  const cookieName = options.cookieName ?? 'csrf-token'
  const tokenLength = options.tokenLength ?? 32
  const ignoreMethods = options.ignoreMethods
    ? new Set(options.ignoreMethods.map((m) => m.toUpperCase()))
    : SAFE_METHODS

  const cookieOpts = {
    httpOnly: options.cookie?.httpOnly ?? false,
    secure: options.cookie?.secure ?? true,
    sameSite: options.cookie?.sameSite ?? ('strict' as const),
    path: options.cookie?.path ?? '/',
    maxAge: (options.cookie?.maxAge ?? 86400) * 1000,
  }

  return async (ctx: RequestContext, next: () => void) => {
    // Read existing cookie token (requires cookie-parser middleware)
    const cookies: Record<string, string> = (ctx.req as any).cookies ?? {}
    let cookieToken: string | undefined = cookies[cookieName]

    // Issue a new token if none exists
    if (!cookieToken) {
      cookieToken = generateToken(tokenLength)
      ctx.res.cookie(cookieName, cookieToken, cookieOpts)
    }

    // Safe methods skip validation
    if (ignoreMethods.has(ctx.req.method.toUpperCase())) {
      return next()
    }

    // Validate: header must match cookie
    const headerToken = ctx.headers[headerName] as string | undefined
    if (!headerToken || headerToken !== cookieToken) {
      log.warn({ method: ctx.req.method, path: ctx.req.path }, 'CSRF token mismatch')
      ctx.res.status(403).json({ error: 'CSRF token mismatch' })
      return
    }

    next()
  }
}
