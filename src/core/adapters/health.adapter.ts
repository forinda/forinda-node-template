import type { Express } from 'express'
import type { Container } from '../container'
import type { AppAdapter } from './adapter'
import { DatabaseService } from '../services/database.service'
import { REDIS } from './redis.adapter'
import { createLogger } from '../logger'

const log = createLogger('HealthAdapter')

/**
 * Result of an individual dependency health check.
 */
export interface HealthCheckResult {
  status: 'up' | 'down'
  /** Time taken for the check in milliseconds. */
  latencyMs?: number
  error?: string
}

/**
 * Full health response returned by readiness and liveness probes.
 */
export interface HealthResponse {
  status: 'ok' | 'degraded'
  timestamp: string
  checks: Record<string, HealthCheckResult>
}

/**
 * Adapter that registers enhanced health check endpoints:
 *
 * - `GET /health` — basic liveness probe (always 200 if process is alive)
 * - `GET /health/ready` — readiness probe that checks database and Redis connectivity
 *
 * Mount this adapter to get production-grade Kubernetes-style probes.
 *
 * @example
 * ```ts
 * new Application({
 *   modules: [...],
 *   adapters: [new HealthAdapter(), ...],
 * })
 * ```
 */
export class HealthAdapter implements AppAdapter {
  /**
   * Registers health endpoints before global middleware so they are always
   * accessible (even if other middleware fails).
   */
  beforeMount(app: Express, container: Container): void {
    // Liveness — always 200 if the process is running
    app.get('/health', (_req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() })
    })

    // Readiness — checks dependencies
    app.get('/health/ready', async (_req, res) => {
      const checks: Record<string, HealthCheckResult> = {}
      let allUp = true

      // Database check
      if (container.has(DatabaseService)) {
        try {
          const db = container.resolve<DatabaseService>(DatabaseService)
          const start = performance.now()
          await db.client`SELECT 1`
          checks.database = { status: 'up', latencyMs: Math.round(performance.now() - start) }
        } catch (err: any) {
          checks.database = { status: 'down', error: err.message }
          allUp = false
          log.warn('Health check: database is down')
        }
      }

      // Redis check
      if (container.has(REDIS)) {
        try {
          const redis = container.resolve<any>(REDIS)
          const start = performance.now()
          await redis.ping()
          checks.redis = { status: 'up', latencyMs: Math.round(performance.now() - start) }
        } catch (err: any) {
          checks.redis = { status: 'down', error: err.message }
          allUp = false
          log.warn('Health check: redis is down')
        }
      }

      const response: HealthResponse = {
        status: allUp ? 'ok' : 'degraded',
        timestamp: new Date().toISOString(),
        checks,
      }

      res.status(allUp ? 200 : 503).json(response)
    })

    log.info('Health check endpoints registered: /health, /health/ready')
  }
}
