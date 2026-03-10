import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { HttpException } from './http-exception'

describe('HttpException', () => {
  it('should create an error with status and message', () => {
    const err = new HttpException(418, "I'm a teapot")
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(HttpException)
    expect(err.status).toBe(418)
    expect(err.message).toBe("I'm a teapot")
    expect(err.name).toBe('HttpException')
  })

  it('badRequest should return 400', () => {
    const err = HttpException.badRequest('Invalid input')
    expect(err.status).toBe(400)
    expect(err.message).toBe('Invalid input')
  })

  it('badRequest should use default message', () => {
    const err = HttpException.badRequest()
    expect(err.message).toBe('Bad request')
  })

  it('unauthorized should return 401', () => {
    const err = HttpException.unauthorized()
    expect(err.status).toBe(401)
    expect(err.message).toBe('Unauthorized')
  })

  it('forbidden should return 403', () => {
    const err = HttpException.forbidden()
    expect(err.status).toBe(403)
  })

  it('notFound should return 404', () => {
    const err = HttpException.notFound('User not found')
    expect(err.status).toBe(404)
    expect(err.message).toBe('User not found')
  })

  it('conflict should return 409', () => {
    const err = HttpException.conflict('Email already in use')
    expect(err.status).toBe(409)
    expect(err.message).toBe('Email already in use')
  })

  it('unprocessable should return 422', () => {
    const err = HttpException.unprocessable()
    expect(err.status).toBe(422)
    expect(err.details).toBeUndefined()
  })

  it('unprocessable should accept validation details', () => {
    const err = HttpException.unprocessable('Validation failed', [
      { field: 'email', message: 'Invalid email format', code: 'invalid_string' },
      { field: 'age', message: 'Expected number, received string', code: 'invalid_type' },
    ])
    expect(err.status).toBe(422)
    expect(err.details).toHaveLength(2)
    expect(err.details![0].field).toBe('email')
    expect(err.details![1].field).toBe('age')
  })

  it('tooManyRequests should return 429', () => {
    const err = HttpException.tooManyRequests()
    expect(err.status).toBe(429)
  })

  it('internal should return 500', () => {
    const err = HttpException.internal()
    expect(err.status).toBe(500)
    expect(err.message).toBe('Internal server error')
  })

  describe('fromZodError', () => {
    it('should use the first issue as the error message with field prefix', () => {
      const schema = z.object({
        name: z.string().min(2),
        email: z.string().email(),
      })

      const result = schema.safeParse({ name: '', email: 'bad' })
      if (result.success) return

      const err = HttpException.fromZodError(result.error)
      expect(err).toBeInstanceOf(HttpException)
      expect(err.status).toBe(422)
      // First issue formatted as "field: message"
      expect(err.message).toMatch(/^(name|email): .+/)
      expect(err.details).toBeUndefined()
    })

    it('should allow custom message override', () => {
      const schema = z.object({ x: z.number() })
      const result = schema.safeParse({ x: 'not a number' })
      if (result.success) return

      const err = HttpException.fromZodError(result.error, 'Invalid input')
      expect(err.message).toBe('Invalid input')
    })

    it('should format nested paths with dot notation', () => {
      const schema = z.object({
        address: z.object({
          city: z.string().min(1),
        }),
      })

      const result = schema.safeParse({ address: { city: '' } })
      if (result.success) return

      const err = HttpException.fromZodError(result.error)
      expect(err.message).toMatch(/^address\.city: .+/)
    })

    it('should omit field prefix for root-level errors', () => {
      const schema = z.string().min(5)
      const result = schema.safeParse('ab')
      if (result.success) return

      const err = HttpException.fromZodError(result.error)
      // No "field: " prefix — just the Zod issue message directly
      expect(err.status).toBe(422)
      expect(err.message).toBeTruthy()
      // Should NOT start with a dot-path prefix like "somefield: ..."
      expect(err.message).not.toMatch(/^[a-z_]+\./)
    })
  })
})
