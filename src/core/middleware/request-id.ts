import crypto from 'node:crypto'
import type { Request, Response, NextFunction } from 'express'

/** Header used to propagate the request ID. */
export const REQUEST_ID_HEADER = 'x-request-id'

/**
 * Express middleware that ensures every request has a unique ID.
 *
 * If the incoming request already carries an `X-Request-Id` header (e.g. from
 * a load balancer or API gateway), the value is reused. Otherwise a new UUIDv4
 * is generated. The ID is attached to the response headers and stored on
 * `req.id` for downstream consumers (loggers, error trackers, etc.).
 */
export function requestId() {
  return (req: Request, res: Response, next: NextFunction) => {
    const id = (req.headers[REQUEST_ID_HEADER] as string) || crypto.randomUUID()
    ;(req as any).id = id
    res.setHeader(REQUEST_ID_HEADER, id)
    next()
  }
}
