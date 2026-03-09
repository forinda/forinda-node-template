import rateLimit, { type Options as RateLimitOptions } from 'express-rate-limit'
import type { Express } from 'express'
import type { Container } from '../container'
import type { AppAdapter } from './adapter'
import { createLogger } from '../logger'

const log = createLogger('RateLimiterAdapter')

/**
 * Configuration for a single rate-limit rule.
 * Each rule applies to a specific set of paths (or globally).
 */
export interface RateLimitRule {
  /** Human-readable name for logging. */
  name: string
  /**
   * Path prefix(es) this rule applies to.
   * Use `'*'` or omit to apply globally.
   *
   * @example '/api/v1/auth'
   * @example ['/api/v1/auth/login', '/api/v1/auth/register']
   */
  paths?: string | string[]
  /** Max requests per window. Default `100`. */
  max?: number
  /** Time window in milliseconds. Default `15 * 60 * 1000` (15 minutes). */
  windowMs?: number
  /** Message returned when rate limit is exceeded. */
  message?: string | Record<string, unknown>
  /** Whether to send `RateLimit-*` headers. Default `true`. */
  standardHeaders?: boolean
  /** Whether to send legacy `X-RateLimit-*` headers. Default `false`. */
  legacyHeaders?: boolean
  /** Skip successful requests from counting. Default `false`. */
  skipSuccessfulRequests?: boolean
  /** Skip failed requests from counting. Default `false`. */
  skipFailedRequests?: boolean
  /**
   * Custom key generator. Defaults to `req.ip`.
   * Useful for keying by user ID, API key, etc.
   */
  keyGenerator?: RateLimitOptions['keyGenerator']
  /**
   * Custom skip function. Return `true` to bypass the limiter for a request.
   */
  skip?: RateLimitOptions['skip']
  /**
   * Custom handler when the rate limit is exceeded.
   * Overrides the default `message` response.
   */
  handler?: RateLimitOptions['handler']
}

/**
 * Configuration options for the {@link RateLimiterAdapter}.
 */
export interface RateLimiterAdapterOptions {
  /**
   * Global defaults applied to every rule unless overridden.
   */
  defaults?: {
    max?: number
    windowMs?: number
    standardHeaders?: boolean
    legacyHeaders?: boolean
    message?: string | Record<string, unknown>
  }
  /**
   * List of rate-limit rules. Each rule creates a separate limiter
   * that can target specific paths or apply globally.
   *
   * Rules are applied in order — Express evaluates them top-down,
   * so place stricter path-specific rules before global ones.
   */
  rules: RateLimitRule[]
}

const DEFAULT_WINDOW_MS = 15 * 60 * 1000 // 15 minutes
const DEFAULT_MAX = 100
const DEFAULT_MESSAGE = { error: 'Too many requests, please try again later' }

/**
 * Application adapter that integrates `express-rate-limit` into the server lifecycle.
 * Supports multiple rules with different windows, limits, and path targets.
 *
 * Rate limiters are mounted **after** global middleware (helmet, cors, etc.)
 * but **before** module routes via the `beforeStart` hook.
 *
 * @example
 * ```ts
 * new Application({
 *   modules: [...],
 *   adapters: [
 *     new RateLimiterAdapter({
 *       defaults: { standardHeaders: true },
 *       rules: [
 *         {
 *           name: 'auth',
 *           paths: ['/api/v1/auth/login', '/api/v1/auth/register'],
 *           max: 10,
 *           windowMs: 15 * 60 * 1000,
 *           message: { error: 'Too many auth attempts, try again in 15 minutes' },
 *         },
 *         {
 *           name: 'global',
 *           max: 200,
 *           windowMs: 15 * 60 * 1000,
 *         },
 *       ],
 *     }),
 *   ],
 * })
 * ```
 */
export class RateLimiterAdapter implements AppAdapter {
  constructor(private readonly options: RateLimiterAdapterOptions) {}

  /**
   * Called before the HTTP server starts. Creates and mounts rate limiters
   * for each configured rule.
   */
  beforeStart(app: Express, _container: Container): void {
    const { defaults = {}, rules } = this.options

    for (const rule of rules) {
      const windowMs = rule.windowMs ?? defaults.windowMs ?? DEFAULT_WINDOW_MS
      const max = rule.max ?? defaults.max ?? DEFAULT_MAX

      const limiter = rateLimit({
        windowMs,
        max,
        message: rule.message ?? defaults.message ?? DEFAULT_MESSAGE,
        standardHeaders: rule.standardHeaders ?? defaults.standardHeaders ?? true,
        legacyHeaders: rule.legacyHeaders ?? defaults.legacyHeaders ?? false,
        skipSuccessfulRequests: rule.skipSuccessfulRequests ?? false,
        skipFailedRequests: rule.skipFailedRequests ?? false,
        keyGenerator: rule.keyGenerator,
        skip: rule.skip,
        handler: rule.handler,
      })

      const paths = rule.paths ? (Array.isArray(rule.paths) ? rule.paths : [rule.paths]) : null

      if (paths) {
        for (const p of paths) {
          app.use(p, limiter)
        }
        log.info(
          `Rate limiter "${rule.name}" mounted on ${paths.join(', ')} ` +
            `(${max} req / ${windowMs / 1000}s)`,
        )
      } else {
        app.use(limiter)
        log.info(
          `Rate limiter "${rule.name}" mounted globally ` + `(${max} req / ${windowMs / 1000}s)`,
        )
      }
    }
  }
}
