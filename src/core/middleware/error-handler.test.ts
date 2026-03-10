import { describe, it, expect } from 'vitest'
import express from 'express'
import request from 'supertest'
import { z } from 'zod'
import { HttpException } from '../errors'
import { notFoundHandler, errorHandler } from './error-handler'

function createApp(
  handler?: (req: express.Request, _res: express.Response, next: express.NextFunction) => void,
) {
  const app = express()
  app.use(express.json())
  if (handler) {
    app.get('/test', handler)
  }
  app.use(notFoundHandler())
  app.use(errorHandler())
  return app
}

describe('notFoundHandler', () => {
  it('should return 404 for unmatched routes', async () => {
    const app = createApp()
    const res = await request(app).get('/unknown')
    expect(res.status).toBe(404)
    expect(res.body.error).toBe('Not found')
  })
})

describe('errorHandler', () => {
  it('should handle HttpException with correct status and message', async () => {
    const app = createApp((_req, _res, next) => {
      next(HttpException.conflict('Email taken'))
    })

    const res = await request(app).get('/test')
    expect(res.status).toBe(409)
    expect(res.body.error).toBe('Email taken')
  })

  it('should handle HttpException with details', async () => {
    const app = createApp((_req, _res, next) => {
      next(
        HttpException.unprocessable('Validation failed', [{ field: 'email', message: 'Required' }]),
      )
    })

    const res = await request(app).get('/test')
    expect(res.status).toBe(422)
    expect(res.body.error).toBe('Validation failed')
    expect(res.body.details).toEqual([{ field: 'email', message: 'Required' }])
  })

  it('should convert raw ZodError to 422 with first issue message', async () => {
    const schema = z.object({ name: z.string().min(2) })

    const app = createApp((_req, _res, next) => {
      const result = schema.safeParse({ name: '' })
      if (!result.success) next(result.error)
    })

    const res = await request(app).get('/test')
    expect(res.status).toBe(422)
    expect(res.body.error).toMatch(/name: /)
  })

  it('should default to 500 for plain errors', async () => {
    const app = createApp((_req, _res, next) => {
      next(new Error('Something broke'))
    })

    const res = await request(app).get('/test')
    expect(res.status).toBe(500)
    expect(res.body.error).toBe('Something broke')
  })

  it('should respect err.status on plain errors', async () => {
    const app = createApp((_req, _res, next) => {
      const err = Object.assign(new Error('Gone'), { status: 410 })
      next(err)
    })

    const res = await request(app).get('/test')
    expect(res.status).toBe(410)
    expect(res.body.error).toBe('Gone')
  })
})
