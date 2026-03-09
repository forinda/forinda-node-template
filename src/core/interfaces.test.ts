import { describe, it, expect, beforeEach } from 'vitest'
import { Container } from './container'
import { Scope, METADATA, TRANSACTION_MANAGER } from './interfaces'
import type { TransactionManager, Buildable } from './interfaces'
import { Builder, Transactional } from './decorators'

describe('Builder pattern', () => {
  it('should add a static builder() method to the class', () => {
    @Builder
    class User {
      name!: string
      age!: number
    }

    const buildable = User as unknown as Buildable<User>
    expect(typeof buildable.builder).toBe('function')
  })

  it('should build instances via fluent chaining', () => {
    @Builder
    class User {
      name!: string
      age!: number
      email!: string
    }

    const buildable = User as unknown as Buildable<User>
    const user = buildable.builder().name('Alice').age(30).email('alice@test.com').build()

    expect(user).toBeInstanceOf(User)
    expect(user.name).toBe('Alice')
    expect(user.age).toBe(30)
    expect(user.email).toBe('alice@test.com')
  })

  it('should support partial building', () => {
    @Builder
    class Config {
      host!: string
      port!: number
    }

    const buildable = Config as unknown as Buildable<Config>
    const config = buildable.builder().host('localhost').build()

    expect(config.host).toBe('localhost')
    expect(config.port).toBeUndefined()
  })

  it('should set BUILDER metadata', () => {
    @Builder
    class Dto {}

    expect(Reflect.getMetadata(METADATA.BUILDER, Dto)).toBe(true)
  })
})

describe('@Transactional decorator', () => {
  beforeEach(() => {
    Container.reset()
  })

  it('should wrap method in transaction lifecycle (begin, commit)', async () => {
    const calls: string[] = []
    const fakeTx = { id: 'tx-1' }

    const mockTxManager: TransactionManager = {
      begin: async () => {
        calls.push('begin')
        return fakeTx
      },
      commit: async (tx) => {
        calls.push('commit')
        expect(tx).toBe(fakeTx)
      },
      rollback: async () => {
        calls.push('rollback')
      },
    }

    const container = Container.getInstance()
    container.registerInstance(TRANSACTION_MANAGER, mockTxManager)

    class OrderService {
      @Transactional()
      async placeOrder() {
        calls.push('execute')
        return 'order-placed'
      }
    }

    const svc = new OrderService()
    const result = await svc.placeOrder()

    expect(result).toBe('order-placed')
    expect(calls).toEqual(['begin', 'execute', 'commit'])
  })

  it('should rollback on error and re-throw', async () => {
    const calls: string[] = []
    const fakeTx = { id: 'tx-2' }

    const mockTxManager: TransactionManager = {
      begin: async () => {
        calls.push('begin')
        return fakeTx
      },
      commit: async () => {
        calls.push('commit')
      },
      rollback: async (tx) => {
        calls.push('rollback')
        expect(tx).toBe(fakeTx)
      },
    }

    const container = Container.getInstance()
    container.registerInstance(TRANSACTION_MANAGER, mockTxManager)

    class FailingService {
      @Transactional()
      async doWork() {
        calls.push('execute')
        throw new Error('something failed')
      }
    }

    const svc = new FailingService()

    await expect(svc.doWork()).rejects.toThrow('something failed')
    expect(calls).toEqual(['begin', 'execute', 'rollback'])
  })

  it('should preserve method arguments', async () => {
    const mockTxManager: TransactionManager = {
      begin: async () => ({}),
      commit: async () => {},
      rollback: async () => {},
    }

    const container = Container.getInstance()
    container.registerInstance(TRANSACTION_MANAGER, mockTxManager)

    class Svc {
      @Transactional()
      async add(a: number, b: number) {
        return a + b
      }
    }

    const svc = new Svc()
    const result = await svc.add(3, 4)
    expect(result).toBe(7)
  })
})

describe('Scope enum', () => {
  it('should have SINGLETON and TRANSIENT values', () => {
    expect(Scope.SINGLETON).toBe('singleton')
    expect(Scope.TRANSIENT).toBe('transient')
  })
})

describe('METADATA keys', () => {
  it('should have all expected keys', () => {
    expect(METADATA.INJECTABLE).toBeDefined()
    expect(METADATA.SCOPE).toBeDefined()
    expect(METADATA.AUTOWIRED).toBeDefined()
    expect(METADATA.INJECT).toBeDefined()
    expect(METADATA.CONFIGURATION).toBeDefined()
    expect(METADATA.BEAN).toBeDefined()
    expect(METADATA.POST_CONSTRUCT).toBeDefined()
    expect(METADATA.TRANSACTIONAL).toBeDefined()
    expect(METADATA.BUILDER).toBeDefined()
    expect(METADATA.ROUTES).toBeDefined()
    expect(METADATA.CONTROLLER_PATH).toBeDefined()
    expect(METADATA.CLASS_MIDDLEWARES).toBeDefined()
    expect(METADATA.METHOD_MIDDLEWARES).toBeDefined()
    expect(METADATA.FILE_UPLOAD).toBeDefined()
    expect(METADATA.PARAM_TYPES).toBe('design:paramtypes')
    expect(METADATA.PROPERTY_TYPE).toBe('design:type')
    expect(METADATA.RETURN_TYPE).toBe('design:returntype')
  })

  it('should use unique symbols for each key', () => {
    const symbolKeys = Object.entries(METADATA)
      .filter(([, v]) => typeof v === 'symbol')
      .map(([, v]) => v)

    const unique = new Set(symbolKeys)
    expect(unique.size).toBe(symbolKeys.length)
  })
})
