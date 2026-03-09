import 'reflect-metadata'
import { Constructor, Scope, METADATA } from './interfaces'
import { createLogger, Logger } from './logger'
import { ConfigService } from './config.service'

const log = createLogger('Container')

/**
 * Internal registration entry that tracks how a dependency should be resolved.
 */
interface Registration {
  /** The concrete class constructor to instantiate. */
  target: Constructor
  /** The lifecycle scope (singleton or transient). */
  scope: Scope
  /** Cached singleton instance, if already created. */
  instance?: any
  /** Optional factory function used instead of constructor instantiation. */
  factory?: () => any
}

/**
 * Inversion-of-Control (IoC) container that manages dependency registration,
 * resolution, and lifecycle. Implements the Singleton pattern so all parts of
 * the application share a single container instance.
 *
 * Supports constructor injection, property injection (`@Autowired`),
 * factory-based beans (`@Bean`), and lifecycle hooks (`@PostConstruct`).
 *
 * @example
 * ```ts
 * const container = Container.getInstance();
 * container.register(MyService, MyService, Scope.SINGLETON);
 * const service = container.resolve<MyService>(MyService);
 * ```
 */
export class Container {
  /** The single shared container instance. */
  private static instance: Container
  /** Map of token to registration entry for all known dependencies. */
  private registrations = new Map<any, Registration>()
  /** Set of tokens currently being resolved, used to detect circular dependencies. */
  private resolving = new Set<any>()

  /**
   * Returns the singleton container instance, creating it if necessary.
   * @returns The global {@link Container} instance.
   */
  static getInstance(): Container {
    if (!Container.instance) {
      Container.instance = new Container()
    }
    return Container.instance
  }

  /**
   * Resets the container by replacing the singleton with a fresh instance.
   * Useful for testing to ensure a clean slate between test runs.
   */
  static reset(): void {
    Container.instance = new Container()
  }

  /**
   * Registers a class constructor under the given token.
   *
   * @param token - The identifier (class, symbol, or string) used to look up this dependency.
   * @param target - The concrete class constructor to instantiate when resolving.
   * @param scope - The lifecycle scope. Defaults to `Scope.SINGLETON`.
   */
  register(token: any, target: Constructor, scope: Scope = Scope.SINGLETON): void {
    this.registrations.set(token, { target, scope })
  }

  /**
   * Registers a factory function under the given token. The factory is called
   * each time the dependency is resolved (or once for singletons).
   *
   * @param token - The identifier used to look up this dependency.
   * @param factory - A zero-argument function that produces the dependency instance.
   * @param scope - The lifecycle scope. Defaults to `Scope.SINGLETON`.
   */
  registerFactory(token: any, factory: () => any, scope: Scope = Scope.SINGLETON): void {
    this.registrations.set(token, { target: Object as any, scope, factory })
  }

  /**
   * Registers a pre-existing instance under the given token. The instance is
   * always treated as a singleton.
   *
   * @param token - The identifier used to look up this dependency.
   * @param instance - The already-constructed object to return on resolution.
   */
  registerInstance(token: any, instance: any): void {
    this.registrations.set(token, {
      target: Object as any,
      scope: Scope.SINGLETON,
      instance,
    })
  }

  /**
   * Resolves a dependency by its token. For singletons, returns the cached
   * instance if available. For transients, creates a new instance each time.
   *
   * @typeParam T - The expected type of the resolved instance.
   * @param token - The identifier (class, symbol, or string) to resolve.
   * @returns The resolved instance of type `T`.
   * @throws {Error} If no binding is found for the given token.
   * @throws {Error} If a circular dependency is detected during resolution.
   */
  resolve<T = any>(token: any): T {
    const reg = this.registrations.get(token)
    if (!reg) {
      const name = typeof token === 'symbol' ? token.toString() : token?.name || token
      throw new Error(`No binding found for: ${name}`)
    }

    if (reg.scope === Scope.SINGLETON && reg.instance !== undefined) {
      return reg.instance
    }

    if (reg.factory) {
      const instance = reg.factory()
      if (reg.scope === Scope.SINGLETON) {
        reg.instance = instance
      }
      return instance
    }

    if (this.resolving.has(token)) {
      throw new Error(`Circular dependency detected: ${reg.target.name}`)
    }
    this.resolving.add(token)

    try {
      const instance = this.createInstance(reg)
      if (reg.scope === Scope.SINGLETON) {
        reg.instance = instance
      }
      return instance
    } finally {
      this.resolving.delete(token)
    }
  }

  /**
   * Checks whether a binding exists for the given token.
   *
   * @param token - The identifier to check.
   * @returns `true` if a registration exists, `false` otherwise.
   */
  has(token: any): boolean {
    return this.registrations.has(token)
  }

  /**
   * Removes all registrations from the container.
   */
  clear(): void {
    this.registrations.clear()
  }

  /**
   * Process all `@Configuration` classes -- call their `@Bean` methods
   * and register the results in the container.
   */
  bootstrap(): void {
    // Register built-in services that can't use @Injectable (circular dep)
    if (!this.has(Logger)) {
      this.registerFactory(Logger, () => new Logger(), Scope.TRANSIENT)
    }
    if (!this.has(ConfigService)) {
      this.registerFactory(ConfigService, () => new ConfigService(), Scope.SINGLETON)
    }

    for (const [, reg] of this.registrations) {
      const isConfig = Reflect.getMetadata(METADATA.CONFIGURATION, reg.target)
      if (isConfig) {
        this.processConfiguration(reg.target)
      }
    }
  }

  /**
   * Creates a new instance of the registered class, resolving constructor
   * parameters, performing property injection, and invoking any `@PostConstruct` hook.
   *
   * @param reg - The registration entry containing the target class and metadata.
   * @returns The fully constructed and injected instance.
   */
  private createInstance(reg: Registration): any {
    const { target } = reg

    // Resolve constructor parameters
    const paramTypes: Constructor[] = Reflect.getMetadata(METADATA.PARAM_TYPES, target) || []
    const paramOverrides: Map<number, any> =
      Reflect.getMetadata(METADATA.INJECT, target) || new Map()

    const args = paramTypes.map((type, index) => {
      const overrideToken = paramOverrides.get(index)
      return this.resolve(overrideToken || type)
    })

    const instance = new target(...args)

    // Property injection (@Autowired)
    this.injectProperties(instance, target)

    // Lifecycle hook (@PostConstruct)
    const postConstruct = Reflect.getMetadata(METADATA.POST_CONSTRUCT, target.prototype)
    if (postConstruct) {
      const result = instance[postConstruct]()
      if (result instanceof Promise) {
        result.catch((err: any) =>
          log.error(`@PostConstruct error in ${target.name}: ${err.message}`),
        )
      }
    }

    return instance
  }

  /**
   * Performs property injection for all `@Autowired`-decorated properties on the instance.
   *
   * @param instance - The object to inject properties into.
   * @param target - The class constructor, used to read metadata.
   */
  private injectProperties(instance: any, target: Constructor): void {
    const autowiredProps: Map<string, any> =
      Reflect.getMetadata(METADATA.AUTOWIRED, target.prototype) || new Map()

    for (const [prop, token] of autowiredProps) {
      instance[prop] = this.resolve(token)
    }
  }

  /**
   * Processes a `@Configuration` class by resolving it, discovering all `@Bean`
   * methods, and registering each bean's return value as a factory in the container.
   *
   * @param target - The configuration class constructor to process.
   */
  private processConfiguration(target: Constructor): void {
    const configInstance = this.resolve(target)
    const beanMethods: string[] = Reflect.getMetadata(METADATA.BEAN, target.prototype) || []

    for (const method of beanMethods) {
      const returnType = Reflect.getMetadata(METADATA.RETURN_TYPE, target.prototype, method)
      const beanOptions = Reflect.getMetadata(METADATA.BEAN_OPTIONS, target.prototype, method)
      const scope = beanOptions?.scope ?? Scope.SINGLETON
      const token = returnType || Symbol(method)

      this.registerFactory(token, () => configInstance[method](), scope)
    }
  }
}
