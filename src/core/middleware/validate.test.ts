import { describe, it, expect, vi } from 'vitest'
import { z } from 'zod'
import { validate } from './validate'

function createMockReqRes(overrides: { body?: any; query?: any; params?: any } = {}) {
  const req: any = {
    body: overrides.body ?? {},
    query: overrides.query ?? {},
    params: overrides.params ?? {},
  }
  const res: any = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  }
  const next = vi.fn()
  return { req, res, next }
}

describe('validate middleware', () => {
  it('should call next() when body validation passes', () => {
    const schema = { body: z.object({ name: z.string() }) }
    const { req, res, next } = createMockReqRes({ body: { name: 'John' } })

    validate(schema)(req, res, next)

    expect(next).toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalled()
  })

  it('should transform validated body onto req.body', () => {
    const schema = {
      body: z.object({ age: z.coerce.number() }),
    }
    const { req, res, next } = createMockReqRes({ body: { age: '25' } })

    validate(schema)(req, res, next)

    expect(req.body.age).toBe(25)
    expect(next).toHaveBeenCalled()
  })

  it('should return 422 when body validation fails', () => {
    const schema = { body: z.object({ name: z.string().min(1) }) }
    const { req, res, next } = createMockReqRes({ body: { name: '' } })

    validate(schema)(req, res, next)

    expect(res.status).toHaveBeenCalledWith(422)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        errors: expect.objectContaining({
          body: expect.any(Array),
        }),
      }),
    )
    expect(next).not.toHaveBeenCalled()
  })

  it('should validate query parameters', () => {
    const schema = { query: z.object({ page: z.coerce.number().min(1) }) }
    const { req, res, next } = createMockReqRes({ query: { page: '0' } })

    validate(schema)(req, res, next)

    expect(res.status).toHaveBeenCalledWith(422)
    expect(next).not.toHaveBeenCalled()
  })

  it('should validate params', () => {
    const schema = { params: z.object({ id: z.string().uuid() }) }
    const { req, res, next } = createMockReqRes({ params: { id: 'not-a-uuid' } })

    validate(schema)(req, res, next)

    expect(res.status).toHaveBeenCalledWith(422)
  })

  it('should pass when all schemas validate', () => {
    const schema = {
      body: z.object({ name: z.string() }),
      query: z.object({ page: z.coerce.number() }),
      params: z.object({ id: z.string() }),
    }
    const { req, res, next } = createMockReqRes({
      body: { name: 'test' },
      query: { page: '1' },
      params: { id: 'abc' },
    })

    validate(schema)(req, res, next)

    expect(next).toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalled()
  })

  it('should collect errors from multiple schema fields', () => {
    const schema = {
      body: z.object({ name: z.string().min(1) }),
      query: z.object({ page: z.coerce.number().positive() }),
    }
    const { req, res, next } = createMockReqRes({
      body: {},
      query: { page: '-1' },
    })

    validate(schema)(req, res, next)

    expect(res.status).toHaveBeenCalledWith(422)
    const errors = res.json.mock.calls[0][0].errors
    expect(errors.body).toBeDefined()
    expect(errors.query).toBeDefined()
  })

  it('should pass when no schemas are provided', () => {
    const { req, res, next } = createMockReqRes()

    validate({})(req, res, next)

    expect(next).toHaveBeenCalled()
  })
})
