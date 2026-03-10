import { z } from 'zod'

/**
 * Structured validation error detail for a single field.
 */
export interface ValidationError {
  /** Dot-notated field path (e.g. `"address.city"`, `"items.0.name"`). */
  field: string
  /** Human-readable error message for this field. */
  message: string
  /** Zod issue code (e.g. `"invalid_type"`, `"too_small"`). */
  code?: string
}

/**
 * Standard HTTP error class for the framework. Extends `Error` with a numeric
 * `status` code and optional structured `details` so the global error handler
 * can build a consistent response.
 *
 * @example
 * ```ts
 * // Simple errors
 * throw new HttpException(409, 'Email already in use')
 * throw HttpException.notFound('User not found')
 *
 * // Zod validation errors
 * const result = schema.safeParse(data)
 * if (!result.success) throw HttpException.fromZodError(result.error)
 *
 * // Manual validation details
 * throw HttpException.unprocessable('Validation failed', [
 *   { field: 'email', message: 'Invalid email format' },
 * ])
 * ```
 */
export class HttpException extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: ValidationError[],
  ) {
    super(message)
    this.name = 'HttpException'
  }

  /**
   * Creates a 422 Unprocessable Entity from a Zod error.
   * Uses only the **first** issue as the error message so the frontend
   * can display a single, actionable validation message at a time.
   *
   * Format: `"field: message"` (or just `"message"` for root-level errors).
   *
   * @example
   * ```ts
   * const result = schema.safeParse(ctx.body)
   * if (!result.success) throw HttpException.fromZodError(result.error)
   * // => { status: 422, error: "email: Invalid email" }
   * ```
   */
  static fromZodError(error: z.ZodError, message?: string) {
    const first = error.issues[0]
    const formatted = first
      ? first.path.length
        ? `${first.path.join('.')}: ${first.message}`
        : first.message
      : 'Validation failed'
    return new HttpException(422, message ?? formatted)
  }

  /** 400 Bad Request */
  static badRequest(message = 'Bad request') {
    return new HttpException(400, message)
  }

  /** 401 Unauthorized */
  static unauthorized(message = 'Unauthorized') {
    return new HttpException(401, message)
  }

  /** 403 Forbidden */
  static forbidden(message = 'Forbidden') {
    return new HttpException(403, message)
  }

  /** 404 Not Found */
  static notFound(message = 'Not found') {
    return new HttpException(404, message)
  }

  /** 409 Conflict */
  static conflict(message = 'Conflict') {
    return new HttpException(409, message)
  }

  /** 422 Unprocessable Entity */
  static unprocessable(message = 'Validation failed', details?: ValidationError[]) {
    return new HttpException(422, message, details)
  }

  /** 429 Too Many Requests */
  static tooManyRequests(message = 'Too many requests') {
    return new HttpException(429, message)
  }

  /** 500 Internal Server Error */
  static internal(message = 'Internal server error') {
    return new HttpException(500, message)
  }
}
