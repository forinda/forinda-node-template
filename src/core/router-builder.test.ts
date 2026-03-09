import { describe, it, expect, beforeEach } from 'vitest'
import express from 'express'
import request from 'supertest'
import { z } from 'zod'
import { Container } from './container'
import { Controller, Get, Post, Put, Delete, Patch, Middleware, FileUpload } from './decorators'
import type { MiddlewareHandler } from './decorators'
import { buildRoutes, getControllerPath } from './router-builder'
import type { RequestContext } from './context'

describe('buildRoutes', () => {
  beforeEach(() => {
    Container.reset()
  })

  function createApp(controllerClass: any): express.Express {
    const app = express()
    app.use(express.json())
    const router = buildRoutes(controllerClass)
    app.use(router)
    return app
  }

  it('should build a GET route from @Get decorator', async () => {
    @Controller()
    class TestCtrl {
      @Get('/hello')
      hello(ctx: RequestContext) {
        ctx.json({ message: 'world' })
      }
    }

    const app = createApp(TestCtrl)
    const res = await request(app).get('/hello')
    expect(res.status).toBe(200)
    expect(res.body.message).toBe('world')
  })

  it('should build a POST route with body validation', async () => {
    const bodySchema = z.object({ name: z.string().min(1) })

    @Controller()
    class TestCtrl {
      @Post('/items', { body: bodySchema })
      create(ctx: RequestContext<{ name: string }>) {
        ctx.created({ name: ctx.body.name })
      }
    }

    const app = createApp(TestCtrl)

    // Valid body
    const ok = await request(app).post('/items').send({ name: 'Test' })
    expect(ok.status).toBe(201)
    expect(ok.body.name).toBe('Test')

    // Invalid body
    const bad = await request(app).post('/items').send({ name: '' })
    expect(bad.status).toBe(422)
  })

  it('should build PUT, DELETE, PATCH routes', async () => {
    @Controller()
    class TestCtrl {
      @Put('/:id')
      update(ctx: RequestContext) {
        ctx.json({ updated: ctx.params.id })
      }

      @Delete('/:id')
      remove(ctx: RequestContext) {
        ctx.noContent()
      }

      @Patch('/:id')
      patch(ctx: RequestContext) {
        ctx.json({ patched: ctx.params.id })
      }
    }

    const app = createApp(TestCtrl)

    const putRes = await request(app).put('/123').send({})
    expect(putRes.status).toBe(200)
    expect(putRes.body.updated).toBe('123')

    const delRes = await request(app).delete('/123')
    expect(delRes.status).toBe(204)

    const patchRes = await request(app).patch('/456').send({})
    expect(patchRes.status).toBe(200)
    expect(patchRes.body.patched).toBe('456')
  })

  it('should apply method-level middleware', async () => {
    const addHeader: MiddlewareHandler = (ctx, next) => {
      ctx.res.setHeader('x-custom', 'from-middleware')
      next()
    }

    @Controller()
    class TestCtrl {
      @Get('/protected')
      @Middleware(addHeader)
      handler(ctx: RequestContext) {
        ctx.json({ ok: true })
      }
    }

    const app = createApp(TestCtrl)
    const res = await request(app).get('/protected')
    expect(res.status).toBe(200)
    expect(res.headers['x-custom']).toBe('from-middleware')
  })

  it('should apply class-level middleware to all routes', async () => {
    const classGuard: MiddlewareHandler = (ctx, next) => {
      if (!ctx.headers['x-api-key']) {
        ctx.res.status(403).json({ error: 'Forbidden' })
        return
      }
      next()
    }

    @Controller()
    @Middleware(classGuard)
    class TestCtrl {
      @Get('/a')
      a(ctx: RequestContext) {
        ctx.json({ ok: true })
      }

      @Get('/b')
      b(ctx: RequestContext) {
        ctx.json({ ok: true })
      }
    }

    const app = createApp(TestCtrl)

    // Without API key — blocked
    const blocked = await request(app).get('/a')
    expect(blocked.status).toBe(403)

    // With API key — passes
    const allowed = await request(app).get('/a').set('x-api-key', 'secret')
    expect(allowed.status).toBe(200)
  })

  it('should catch handler errors and return 400', async () => {
    @Controller()
    class TestCtrl {
      @Get('/error')
      handler(_ctx: RequestContext) {
        throw new Error('Something broke')
      }
    }

    const app = createApp(TestCtrl)
    const res = await request(app).get('/error')
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Something broke')
  })
})

describe('getControllerPath', () => {
  beforeEach(() => {
    Container.reset()
  })

  it('should return the path from @Controller decorator', () => {
    @Controller('/users')
    class UserCtrl {}
    expect(getControllerPath(UserCtrl)).toBe('/users')
  })

  it('should return "/" when no path was specified', () => {
    @Controller()
    class DefaultCtrl {}
    expect(getControllerPath(DefaultCtrl)).toBe('/')
  })
})
