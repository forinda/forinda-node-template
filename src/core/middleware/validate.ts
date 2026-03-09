import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'

/**
 * Express middleware that validates request data against a Zod schema.
 * Parses `body`, `query`, and `params` independently — only validates
 * the fields present in the schema.
 *
 * On failure, responds with 422 and a structured error object.
 *
 * @param schema - A Zod object schema with optional `body`, `query`, and `params` keys.
 * @returns Express middleware function.
 *
 * @example
 * ```ts
 * router.post('/', validate({ body: createUserSchema }), handler)
 * ```
 */
export function validate(schema: { body?: z.ZodType; query?: z.ZodType; params?: z.ZodType }) {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: Record<string, string[]> = {}

    if (schema.body) {
      const result = schema.body.safeParse(req.body)
      if (!result.success) {
        errors.body = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`)
      } else {
        req.body = result.data
      }
    }

    if (schema.query) {
      const result = schema.query.safeParse(req.query)
      if (!result.success) {
        errors.query = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`)
      }
    }

    if (schema.params) {
      const result = schema.params.safeParse(req.params)
      if (!result.success) {
        errors.params = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`)
      }
    }

    if (Object.keys(errors).length > 0) {
      res.status(422).json({ errors })
      return
    }

    next()
  }
}
