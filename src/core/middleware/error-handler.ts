import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { HttpException } from '../errors'
import { createLogger } from '../logger'

const log = createLogger('ErrorHandler')

/**
 * Express middleware that catches unmatched routes and returns a 404.
 * Mount this after all route handlers.
 */
export function notFoundHandler() {
  return (_req: Request, res: Response) => {
    res.status(404).json({ error: 'Not found' })
  }
}

/**
 * Global Express error handler. Must have 4 parameters so Express treats it
 * as error middleware. Mount this after the 404 catch-all.
 *
 * Handles:
 * - **ZodError** — converted to 422 with the first issue as the message
 * - **HttpException** — uses `status` and `message`, includes `details` if present
 * - **Any other error** — returns 500 with the error message (or generic fallback)
 *
 * @example
 * ```ts
 * app.use(notFoundHandler())
 * app.use(errorHandler())
 * ```
 */
export function errorHandler() {
  return (err: any, _req: Request, res: Response, _next: NextFunction) => {
    // Raw ZodError thrown outside the validate middleware
    if (err instanceof z.ZodError) {
      const converted = HttpException.fromZodError(err)
      if (!res.headersSent) {
        res.status(converted.status).json({ error: converted.message })
      }
      return
    }

    log.error(err, 'Unhandled request error')
    if (!res.headersSent) {
      const status = err.status ?? 500
      const body: Record<string, any> = {
        error: err.message ?? 'Internal server error',
      }
      if (err instanceof HttpException && err.details) {
        body.details = err.details
      }
      res.status(status).json(body)
    }
  }
}
