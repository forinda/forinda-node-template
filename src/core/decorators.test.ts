import { describe, it, expect, beforeEach } from 'vitest'
import { Container } from './container'
import { Scope, METADATA } from './interfaces'
import {
  Injectable,
  Service,
  Component,
  Controller,
  Repository,
  Configuration,
  Bean,
  Autowired,
  Inject,
  Value,
  PostConstruct,
  Middleware,
  FileUpload,
  Get,
  Post,
  Put,
  Delete,
  Patch,
} from './decorators'
import type { RouteDefinition, MiddlewareHandler } from './decorators'

describe('Decorators', () => {
  beforeEach(() => {
    Container.reset()
  })

  describe('@Injectable', () => {
    it('should register the class in the container as singleton by default', () => {
      @Injectable()
      class TestService {}

      const container = Container.getInstance()
      expect(container.has(TestService)).toBe(true)
      const a = container.resolve(TestService)
      const b = container.resolve(TestService)
      expect(a).toBe(b)
    })

    it('should respect transient scope', () => {
      @Injectable({ scope: Scope.TRANSIENT })
      class TransientService {}

      const container = Container.getInstance()
      const a = container.resolve(TransientService)
      const b = container.resolve(TransientService)
      expect(a).not.toBe(b)
    })

    it('should set INJECTABLE metadata', () => {
      @Injectable()
      class Svc {}
      expect(Reflect.getMetadata(METADATA.INJECTABLE, Svc)).toBe(true)
    })
  })

  describe('@Service', () => {
    it('should register as singleton', () => {
      @Service()
      class MyService {}

      const container = Container.getInstance()
      const a = container.resolve(MyService)
      const b = container.resolve(MyService)
      expect(a).toBe(b)
    })
  })

  describe('@Component', () => {
    it('should register as singleton', () => {
      @Component()
      class MyComponent {}

      const container = Container.getInstance()
      expect(container.has(MyComponent)).toBe(true)
    })
  })

  describe('@Repository', () => {
    it('should register as singleton', () => {
      @Repository()
      class MyRepo {}

      const container = Container.getInstance()
      expect(container.has(MyRepo)).toBe(true)
    })
  })

  describe('@Controller', () => {
    it('should register in container and store path metadata', () => {
      @Controller('/users')
      class UserController {}

      const container = Container.getInstance()
      expect(container.has(UserController)).toBe(true)
      expect(Reflect.getMetadata(METADATA.CONTROLLER_PATH, UserController)).toBe('/users')
    })

    it('should work without a path', () => {
      @Controller()
      class DefaultController {}

      const container = Container.getInstance()
      expect(container.has(DefaultController)).toBe(true)
    })
  })

  describe('@Configuration and @Bean', () => {
    it('should mark class as configuration and register beans', () => {
      class MyDep {
        value = 'from-bean'
      }

      @Configuration()
      class AppConfig {
        @Bean()
        createMyDep(): MyDep {
          return new MyDep()
        }
      }

      expect(Reflect.getMetadata(METADATA.CONFIGURATION, AppConfig)).toBe(true)
      const beans: string[] = Reflect.getMetadata(METADATA.BEAN, AppConfig.prototype)
      expect(beans).toContain('createMyDep')
    })
  })

  describe('@Autowired', () => {
    it('should register property injection metadata', () => {
      @Service()
      class DepService {
        value = 'dep'
      }

      class Consumer {
        @Autowired()
        dep!: DepService
      }

      const props: Map<string, any> = Reflect.getMetadata(METADATA.AUTOWIRED, Consumer.prototype)
      expect(props).toBeDefined()
      expect(props.has('dep')).toBe(true)
    })

    it('should support explicit token override', () => {
      const TOKEN = Symbol('dep')

      class Consumer {
        @Autowired(TOKEN)
        dep!: unknown
      }

      const props: Map<string, any> = Reflect.getMetadata(METADATA.AUTOWIRED, Consumer.prototype)
      expect(props.get('dep')).toBe(TOKEN)
    })
  })

  describe('@Inject', () => {
    it('should store parameter injection overrides', () => {
      const TOKEN = Symbol('repo')

      class MyService {
        constructor(@Inject(TOKEN) public repo: any) {}
      }

      const overrides: Map<number, any> = Reflect.getMetadata(METADATA.INJECT, MyService)
      expect(overrides.get(0)).toBe(TOKEN)
    })
  })

  describe('@Value', () => {
    it('should define a getter on the prototype that reads from process.env', () => {
      process.env.TEST_VALUE_KEY = 'hello-world'

      class Config {
        @Value('TEST_VALUE_KEY')
        myValue!: string
      }

      // The getter is on the prototype (class fields may shadow it on instances)
      const descriptor = Object.getOwnPropertyDescriptor(Config.prototype, 'myValue')
      expect(descriptor?.get).toBeDefined()
      expect(descriptor!.get!.call(null)).toBe('hello-world')
      delete process.env.TEST_VALUE_KEY
    })

    it('should use the default value when env var is not set', () => {
      class Config {
        @Value('NONEXISTENT_KEY', 'fallback')
        myValue!: string
      }

      const descriptor = Object.getOwnPropertyDescriptor(Config.prototype, 'myValue')
      expect(descriptor?.get).toBeDefined()
      expect(descriptor!.get!.call(null)).toBe('fallback')
    })
  })

  describe('@PostConstruct', () => {
    it('should store the method name as post-construct hook', () => {
      class Svc {
        @PostConstruct()
        init() {}
      }

      const hook = Reflect.getMetadata(METADATA.POST_CONSTRUCT, Svc.prototype)
      expect(hook).toBe('init')
    })
  })

  describe('HTTP Method decorators', () => {
    it('@Get should register a GET route', () => {
      class Ctrl {
        @Get('/items')
        list() {}
      }

      const routes: RouteDefinition[] = Reflect.getMetadata(METADATA.ROUTES, Ctrl.prototype)
      expect(routes).toHaveLength(1)
      expect(routes[0].method).toBe('get')
      expect(routes[0].path).toBe('/items')
      expect(routes[0].handlerName).toBe('list')
    })

    it('@Post should register a POST route with validation', () => {
      const { z } = require('zod')
      const bodySchema = z.object({ name: z.string() })

      class Ctrl {
        @Post('/items', { body: bodySchema })
        create() {}
      }

      const routes: RouteDefinition[] = Reflect.getMetadata(METADATA.ROUTES, Ctrl.prototype)
      expect(routes[0].method).toBe('post')
      expect(routes[0].validation?.body).toBe(bodySchema)
    })

    it('@Put should register a PUT route', () => {
      class Ctrl {
        @Put('/:id')
        update() {}
      }

      const routes: RouteDefinition[] = Reflect.getMetadata(METADATA.ROUTES, Ctrl.prototype)
      expect(routes[0].method).toBe('put')
      expect(routes[0].path).toBe('/:id')
    })

    it('@Delete should register a DELETE route', () => {
      class Ctrl {
        @Delete('/:id')
        remove() {}
      }

      const routes: RouteDefinition[] = Reflect.getMetadata(METADATA.ROUTES, Ctrl.prototype)
      expect(routes[0].method).toBe('delete')
    })

    it('@Patch should register a PATCH route', () => {
      class Ctrl {
        @Patch('/:id')
        patch() {}
      }

      const routes: RouteDefinition[] = Reflect.getMetadata(METADATA.ROUTES, Ctrl.prototype)
      expect(routes[0].method).toBe('patch')
    })

    it('should support multiple routes on one class', () => {
      class Ctrl {
        @Get('/')
        list() {}

        @Post('/')
        create() {}

        @Get('/:id')
        getOne() {}
      }

      const routes: RouteDefinition[] = Reflect.getMetadata(METADATA.ROUTES, Ctrl.prototype)
      expect(routes).toHaveLength(3)
    })
  })

  describe('@Middleware', () => {
    it('should store class-level middlewares', () => {
      const guard: MiddlewareHandler = (_ctx, next) => next()

      @Middleware(guard)
      class Ctrl {}

      const mws: MiddlewareHandler[] = Reflect.getMetadata(METADATA.CLASS_MIDDLEWARES, Ctrl)
      expect(mws).toHaveLength(1)
      expect(mws[0]).toBe(guard)
    })

    it('should store method-level middlewares', () => {
      const logger: MiddlewareHandler = (_ctx, next) => next()

      class Ctrl {
        @Middleware(logger)
        @Get('/')
        list() {}
      }

      const mws: MiddlewareHandler[] = Reflect.getMetadata(
        METADATA.METHOD_MIDDLEWARES,
        Ctrl.prototype,
        'list',
      )
      expect(mws).toHaveLength(1)
      expect(mws[0]).toBe(logger)
    })

    it('should accumulate multiple middlewares', () => {
      const mw1: MiddlewareHandler = (_ctx, next) => next()
      const mw2: MiddlewareHandler = (_ctx, next) => next()

      @Middleware(mw1, mw2)
      class Ctrl {}

      const mws: MiddlewareHandler[] = Reflect.getMetadata(METADATA.CLASS_MIDDLEWARES, Ctrl)
      expect(mws).toHaveLength(2)
    })
  })

  describe('@FileUpload', () => {
    it('should store file upload config on a method', () => {
      class Ctrl {
        @FileUpload({ mode: 'single', fieldName: 'avatar', maxSize: 2 * 1024 * 1024 })
        @Post('/upload')
        upload() {}
      }

      const config = Reflect.getMetadata(METADATA.FILE_UPLOAD, Ctrl.prototype, 'upload')
      expect(config.mode).toBe('single')
      expect(config.fieldName).toBe('avatar')
      expect(config.maxSize).toBe(2 * 1024 * 1024)
    })

    it('should accept a string shorthand', () => {
      class Ctrl {
        @FileUpload('array')
        @Post('/files')
        uploadMany() {}
      }

      const config = Reflect.getMetadata(METADATA.FILE_UPLOAD, Ctrl.prototype, 'uploadMany')
      expect(config.mode).toBe('array')
    })
  })
})
