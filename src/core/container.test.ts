import { describe, it, expect, beforeEach } from 'vitest'
import { Container } from './container'
import { Scope, METADATA } from './interfaces'
import { Logger } from './logger'
import { ConfigService } from './config.service'

describe('Container', () => {
  beforeEach(() => {
    Container.reset()
  })

  describe('getInstance', () => {
    it('should return the same singleton instance', () => {
      const a = Container.getInstance()
      const b = Container.getInstance()
      expect(a).toBe(b)
    })
  })

  describe('reset', () => {
    it('should create a fresh container instance', () => {
      const a = Container.getInstance()
      a.register('token', class Foo {})
      Container.reset()
      const b = Container.getInstance()
      expect(b.has('token')).toBe(false)
    })
  })

  describe('register & resolve', () => {
    it('should register and resolve a class by itself', () => {
      const container = Container.getInstance()
      class MyService {
        value = 42
      }
      container.register(MyService, MyService)
      const instance = container.resolve<MyService>(MyService)
      expect(instance).toBeInstanceOf(MyService)
      expect(instance.value).toBe(42)
    })

    it('should register and resolve by a symbol token', () => {
      const container = Container.getInstance()
      const TOKEN = Symbol('MyService')
      class MyService {
        value = 'hello'
      }
      container.register(TOKEN, MyService)
      const instance = container.resolve<MyService>(TOKEN)
      expect(instance).toBeInstanceOf(MyService)
      expect(instance.value).toBe('hello')
    })

    it('should register and resolve by a string token', () => {
      const container = Container.getInstance()
      class MyService {}
      container.register('my-service', MyService)
      const instance = container.resolve('my-service')
      expect(instance).toBeInstanceOf(MyService)
    })
  })

  describe('singleton scope', () => {
    it('should return the same instance for singleton scope', () => {
      const container = Container.getInstance()
      class MyService {}
      container.register(MyService, MyService, Scope.SINGLETON)
      const a = container.resolve(MyService)
      const b = container.resolve(MyService)
      expect(a).toBe(b)
    })
  })

  describe('transient scope', () => {
    it('should return different instances for transient scope', () => {
      const container = Container.getInstance()
      class MyService {}
      container.register(MyService, MyService, Scope.TRANSIENT)
      const a = container.resolve(MyService)
      const b = container.resolve(MyService)
      expect(a).not.toBe(b)
    })
  })

  describe('registerFactory', () => {
    it('should resolve using a factory function', () => {
      const container = Container.getInstance()
      const TOKEN = Symbol('config')
      container.registerFactory(TOKEN, () => ({ db: 'postgres://localhost' }))
      const config = container.resolve<{ db: string }>(TOKEN)
      expect(config.db).toBe('postgres://localhost')
    })

    it('should cache singleton factory result', () => {
      const container = Container.getInstance()
      let callCount = 0
      const TOKEN = Symbol('counter')
      container.registerFactory(
        TOKEN,
        () => {
          callCount++
          return { count: callCount }
        },
        Scope.SINGLETON,
      )
      const a = container.resolve(TOKEN)
      const b = container.resolve(TOKEN)
      expect(a).toBe(b)
      expect(callCount).toBe(1)
    })

    it('should call factory each time for transient scope', () => {
      const container = Container.getInstance()
      let callCount = 0
      const TOKEN = Symbol('counter')
      container.registerFactory(
        TOKEN,
        () => {
          callCount++
          return { count: callCount }
        },
        Scope.TRANSIENT,
      )
      container.resolve(TOKEN)
      container.resolve(TOKEN)
      expect(callCount).toBe(2)
    })
  })

  describe('registerInstance', () => {
    it('should return the exact pre-existing instance', () => {
      const container = Container.getInstance()
      const TOKEN = Symbol('instance')
      const obj = { key: 'value' }
      container.registerInstance(TOKEN, obj)
      const resolved = container.resolve(TOKEN)
      expect(resolved).toBe(obj)
    })
  })

  describe('has', () => {
    it('should return true for registered tokens', () => {
      const container = Container.getInstance()
      class Svc {}
      container.register(Svc, Svc)
      expect(container.has(Svc)).toBe(true)
    })

    it('should return false for unregistered tokens', () => {
      const container = Container.getInstance()
      expect(container.has(Symbol('unknown'))).toBe(false)
    })
  })

  describe('clear', () => {
    it('should remove all registrations', () => {
      const container = Container.getInstance()
      class A {}
      class B {}
      container.register(A, A)
      container.register(B, B)
      container.clear()
      expect(container.has(A)).toBe(false)
      expect(container.has(B)).toBe(false)
    })
  })

  describe('error handling', () => {
    it('should throw when resolving an unregistered token', () => {
      const container = Container.getInstance()
      expect(() => container.resolve(Symbol('nope'))).toThrow('No binding found for')
    })

    it('should throw when resolving an unregistered class', () => {
      const container = Container.getInstance()
      class Unknown {}
      expect(() => container.resolve(Unknown)).toThrow('No binding found for: Unknown')
    })
  })

  describe('constructor injection', () => {
    it('should resolve constructor parameters via reflect metadata', () => {
      const container = Container.getInstance()

      class Dep {
        value = 'injected'
      }
      container.register(Dep, Dep)

      class Consumer {
        constructor(public dep: Dep) {}
      }
      Reflect.defineMetadata(METADATA.PARAM_TYPES, [Dep], Consumer)
      container.register(Consumer, Consumer)

      const instance = container.resolve<Consumer>(Consumer)
      expect(instance.dep).toBeInstanceOf(Dep)
      expect(instance.dep.value).toBe('injected')
    })

    it('should use @Inject override for constructor parameters', () => {
      const container = Container.getInstance()
      const TOKEN = Symbol('dep')

      class Dep {
        value = 'from-token'
      }
      container.register(TOKEN, Dep)

      class Consumer {
        constructor(public dep: Dep) {}
      }
      Reflect.defineMetadata(METADATA.PARAM_TYPES, [Object], Consumer)
      const overrides = new Map<number, any>()
      overrides.set(0, TOKEN)
      Reflect.defineMetadata(METADATA.INJECT, overrides, Consumer)
      container.register(Consumer, Consumer)

      const instance = container.resolve<Consumer>(Consumer)
      expect(instance.dep).toBeInstanceOf(Dep)
      expect(instance.dep.value).toBe('from-token')
    })
  })

  describe('property injection (@Autowired)', () => {
    it('should inject properties marked with @Autowired metadata', () => {
      const container = Container.getInstance()

      class Dep {
        value = 'autowired'
      }
      container.register(Dep, Dep)

      class Consumer {
        dep!: Dep
      }
      const autowiredProps = new Map<string, any>()
      autowiredProps.set('dep', Dep)
      Reflect.defineMetadata(METADATA.AUTOWIRED, autowiredProps, Consumer.prototype)
      container.register(Consumer, Consumer)

      const instance = container.resolve<Consumer>(Consumer)
      expect(instance.dep).toBeInstanceOf(Dep)
      expect(instance.dep.value).toBe('autowired')
    })
  })

  describe('PostConstruct lifecycle hook', () => {
    it('should call @PostConstruct method after creation', () => {
      const container = Container.getInstance()
      let called = false

      class MyService {
        init() {
          called = true
        }
      }
      Reflect.defineMetadata(METADATA.POST_CONSTRUCT, 'init', MyService.prototype)
      container.register(MyService, MyService)

      container.resolve(MyService)
      expect(called).toBe(true)
    })
  })

  describe('bootstrap (Configuration & Bean)', () => {
    it('should process @Configuration classes and register @Bean factories', () => {
      const container = Container.getInstance()

      class DbConnection {
        url = 'postgres://localhost'
      }

      class AppConfig {
        createDb(): DbConnection {
          return new DbConnection()
        }
      }

      Reflect.defineMetadata(METADATA.INJECTABLE, true, AppConfig)
      Reflect.defineMetadata(METADATA.CONFIGURATION, true, AppConfig)
      Reflect.defineMetadata(METADATA.SCOPE, Scope.SINGLETON, AppConfig)
      container.register(AppConfig, AppConfig)

      Reflect.defineMetadata(METADATA.BEAN, ['createDb'], AppConfig.prototype)
      Reflect.defineMetadata(METADATA.RETURN_TYPE, DbConnection, AppConfig.prototype, 'createDb')

      container.bootstrap()

      const db = container.resolve<DbConnection>(DbConnection)
      expect(db).toBeInstanceOf(DbConnection)
      expect(db.url).toBe('postgres://localhost')
    })

    it('should register Logger and ConfigService as built-ins', () => {
      const container = Container.getInstance()
      container.bootstrap()

      expect(container.has(Logger)).toBe(true)
      expect(container.has(ConfigService)).toBe(true)
    })
  })
})
