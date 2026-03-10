import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import { Container } from './container'
import { Application } from './application'
import { Controller, Get, Post } from './decorators'
import { buildRoutes } from './router-builder'
import type { RequestContext } from './context'
import type { AppModule, ModuleRoutes, AppModuleClass } from './app-module'
import type { AppAdapter } from './adapters/adapter'
import { HealthAdapter } from './adapters/health.adapter'
import { z } from 'zod'

// Simple test controller
@Controller()
class ItemController {
  @Get('/')
  list(ctx: RequestContext) {
    ctx.json([{ id: 1, name: 'Test' }])
  }

  @Post('/', { body: z.object({ name: z.string() }) })
  create(ctx: RequestContext<{ name: string }>) {
    ctx.created({ id: 2, name: ctx.body.name })
  }
}

class ItemModule implements AppModule {
  register(container: Container): void {
    container.register(ItemController, ItemController)
  }
  routes(): ModuleRoutes {
    return {
      path: '/items',
      router: buildRoutes(ItemController),
      controller: ItemController,
    }
  }
}

describe('Application', () => {
  let app: Application

  beforeEach(() => {
    Container.reset()
  })

  afterEach(async () => {
    if (app) await app.shutdown()
  })

  it('should mount module routes under /api/v1', async () => {
    app = new Application({
      modules: [ItemModule as AppModuleClass],
      helmet: false,
      cors: false,
      compression: false,
      morgan: false,
    })

    // Access express app directly for supertest (no need to start http server)
    ;(app as any).setup()
    const expressApp = app.getExpressApp()

    const res = await request(expressApp).get('/api/v1/items/')
    expect(res.status).toBe(200)
    expect(res.body).toEqual([{ id: 1, name: 'Test' }])
  })

  it('should validate POST request bodies', async () => {
    app = new Application({
      modules: [ItemModule as AppModuleClass],
      helmet: false,
      cors: false,
      compression: false,
      morgan: false,
    })
    ;(app as any).setup()
    const expressApp = app.getExpressApp()

    const ok = await request(expressApp).post('/api/v1/items/').send({ name: 'New Item' })
    expect(ok.status).toBe(201)
    expect(ok.body.name).toBe('New Item')

    const bad = await request(expressApp).post('/api/v1/items/').send({})
    expect(bad.status).toBe(422)
  })

  it('should expose /health endpoint via HealthAdapter', async () => {
    app = new Application({
      modules: [],
      adapters: [new HealthAdapter()],
      helmet: false,
      cors: false,
      compression: false,
      morgan: false,
    })
    ;(app as any).setup()
    const expressApp = app.getExpressApp()

    const res = await request(expressApp).get('/health')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
    expect(res.body.timestamp).toBeDefined()
  })

  it('should expose /health/ready readiness probe', async () => {
    app = new Application({
      modules: [],
      adapters: [new HealthAdapter()],
      helmet: false,
      cors: false,
      compression: false,
      morgan: false,
    })
    ;(app as any).setup()
    const expressApp = app.getExpressApp()

    const res = await request(expressApp).get('/health/ready')
    // No DB or Redis registered, so checks object is empty but status is ok
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
    expect(res.body.checks).toBeDefined()
  })

  it('should include x-request-id header on responses', async () => {
    app = new Application({
      modules: [ItemModule as AppModuleClass],
      helmet: false,
      cors: false,
      compression: false,
      morgan: false,
    })
    ;(app as any).setup()
    const expressApp = app.getExpressApp()

    const res = await request(expressApp).get('/api/v1/items/')
    expect(res.headers['x-request-id']).toBeDefined()
    expect(res.headers['x-request-id']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    )
  })

  it('should respect custom apiPrefix and defaultVersion', async () => {
    @Controller()
    class VersionCtrl {
      @Get('/')
      handler(ctx: RequestContext) {
        ctx.json({ version: 2 })
      }
    }

    class VersionModule implements AppModule {
      register(_container: Container): void {}
      routes(): ModuleRoutes {
        return {
          path: '/test',
          router: buildRoutes(VersionCtrl),
          version: 2,
        }
      }
    }

    app = new Application({
      modules: [VersionModule as AppModuleClass],
      apiPrefix: '/v-api',
      defaultVersion: 1,
      helmet: false,
      cors: false,
      compression: false,
      morgan: false,
    })
    ;(app as any).setup()
    const expressApp = app.getExpressApp()

    const res = await request(expressApp).get('/v-api/v2/test/')
    expect(res.status).toBe(200)
    expect(res.body.version).toBe(2)
  })

  it('should call adapter lifecycle hooks', async () => {
    const hooks: string[] = []

    const testAdapter: AppAdapter = {
      beforeMount: () => {
        hooks.push('beforeMount')
      },
      beforeStart: () => {
        hooks.push('beforeStart')
      },
      afterStart: () => {
        hooks.push('afterStart')
      },
      shutdown: () => {
        hooks.push('shutdown')
      },
    }

    app = new Application({
      modules: [],
      adapters: [testAdapter],
      helmet: false,
      cors: false,
      compression: false,
      morgan: false,
    })
    ;(app as any).setup()
    expect(hooks).toContain('beforeMount')
    expect(hooks).toContain('beforeStart')

    await app.shutdown()
    expect(hooks).toContain('shutdown')
  })

  it('should support multiple modules with different routes', async () => {
    @Controller()
    class ACtrl {
      @Get('/')
      handler(ctx: RequestContext) {
        ctx.json({ module: 'a' })
      }
    }

    @Controller()
    class BCtrl {
      @Get('/')
      handler(ctx: RequestContext) {
        ctx.json({ module: 'b' })
      }
    }

    class AModule implements AppModule {
      register(): void {}
      routes(): ModuleRoutes {
        return { path: '/a', router: buildRoutes(ACtrl) }
      }
    }

    class BModule implements AppModule {
      register(): void {}
      routes(): ModuleRoutes {
        return { path: '/b', router: buildRoutes(BCtrl) }
      }
    }

    app = new Application({
      modules: [AModule as AppModuleClass, BModule as AppModuleClass],
      helmet: false,
      cors: false,
      compression: false,
      morgan: false,
    })
    ;(app as any).setup()
    const expressApp = app.getExpressApp()

    const a = await request(expressApp).get('/api/v1/a/')
    expect(a.body.module).toBe('a')

    const b = await request(expressApp).get('/api/v1/b/')
    expect(b.body.module).toBe('b')
  })
})
