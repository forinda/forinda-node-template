/**
 * A generic constructor type representing any class that can be instantiated with `new`.
 *
 * @typeParam T - The instance type produced by the constructor. Defaults to `any`.
 */
export type Constructor<T = any> = new (...args: any[]) => T

/**
 * Defines the lifecycle scope for a dependency-injected service.
 *
 * - `SINGLETON` - A single shared instance is created and reused across the entire container.
 * - `TRANSIENT` - A new instance is created every time the dependency is resolved.
 */
export enum Scope {
  /** A single shared instance is reused for all resolutions. */
  SINGLETON = 'singleton',
  /** A new instance is created on every resolution. */
  TRANSIENT = 'transient',
}

/**
 * Options for configuring a service registered in the dependency injection container.
 */
export interface ServiceOptions {
  /** The lifecycle scope of the service. Defaults to `Scope.SINGLETON` if not specified. */
  scope?: Scope
}

/**
 * Options for configuring a bean factory method inside a `@Configuration` class.
 */
export interface BeanOptions {
  /** The lifecycle scope of the bean. Defaults to `Scope.SINGLETON` if not specified. */
  scope?: Scope
}

/**
 * Internal metadata keys used by the dependency injection system to store
 * decorator information via `reflect-metadata`. These symbols and strings
 * serve as keys for `Reflect.defineMetadata` / `Reflect.getMetadata`.
 */
export const METADATA = {
  /** Marks a class as injectable (managed by the DI container). */
  INJECTABLE: Symbol('di:injectable'),
  /** Stores the lifecycle scope of a class. */
  SCOPE: Symbol('di:scope'),
  /** Stores the map of property-injected dependencies for a class. */
  AUTOWIRED: Symbol('di:autowired'),
  /** Stores constructor parameter injection overrides (token-based). */
  INJECT: Symbol('di:inject'),
  /** Marks a class as a configuration provider containing `@Bean` methods. */
  CONFIGURATION: Symbol('di:configuration'),
  /** Stores the list of `@Bean`-decorated method names on a configuration class. */
  BEAN: Symbol('di:bean'),
  /** Stores options for a specific `@Bean` method. */
  BEAN_OPTIONS: Symbol('di:bean_options'),
  /** Stores the method name designated as a `@PostConstruct` lifecycle hook. */
  POST_CONSTRUCT: Symbol('di:post_construct'),
  /** Marks a method as transactional. */
  TRANSACTIONAL: Symbol('di:transactional'),
  /** Marks a class as having an auto-generated builder. */
  BUILDER: Symbol('di:builder'),
  /** Stores the route prefix path for a @Controller class. */
  CONTROLLER_PATH: Symbol('di:controller_path'),
  /** Stores the array of route definitions on a controller class. */
  ROUTES: Symbol('di:routes'),
  /** Stores class-level middleware handlers for a controller. */
  CLASS_MIDDLEWARES: Symbol('di:class_middlewares'),
  /** Stores method-level middleware handlers on a controller method. */
  METHOD_MIDDLEWARES: Symbol('di:method_middlewares'),
  /** TypeScript emit key for constructor parameter types. */
  PARAM_TYPES: 'design:paramtypes',
  /** TypeScript emit key for a property's declared type. */
  PROPERTY_TYPE: 'design:type',
  /** TypeScript emit key for a method's return type. */
  RETURN_TYPE: 'design:returntype',
} as const

/**
 * Abstraction for managing database or resource transactions.
 * Implement this interface and register it under the `TRANSACTION_MANAGER`
 * token so that `@Transactional` decorated methods can automatically
 * begin, commit, and rollback transactions.
 */
export interface TransactionManager {
  /**
   * Begin a new transaction.
   * @returns A promise resolving to a transaction handle (connection, session, etc.).
   */
  begin(): Promise<any>

  /**
   * Commit a previously begun transaction.
   * @param tx - The transaction handle returned by {@link begin}.
   */
  commit(tx: any): Promise<void>

  /**
   * Rollback a previously begun transaction on failure.
   * @param tx - The transaction handle returned by {@link begin}.
   */
  rollback(tx: any): Promise<void>
}

/**
 * DI token used to register and resolve the {@link TransactionManager} implementation.
 *
 * @example
 * ```ts
 * container.registerInstance(TRANSACTION_MANAGER, myTransactionManager);
 * ```
 */
export const TRANSACTION_MANAGER = Symbol('TransactionManager')

/**
 * A mapped type that converts every property of `T` into a fluent setter
 * method returning `BuilderOf<T>`, enabling method-chaining.
 * Call `build()` to produce the final instance.
 *
 * @typeParam T - The target type whose properties become setter methods.
 *
 * @example
 * ```ts
 * const user = UserClass.builder()
 *   .name('Alice')
 *   .age(30)
 *   .build();
 * ```
 */
export type BuilderOf<T> = {
  [K in keyof T]-?: (value: T[K]) => BuilderOf<T>
} & { build(): T }

/**
 * Represents a class that has been enhanced with the `@Builder` decorator,
 * providing a static `builder()` factory method that returns a fluent {@link BuilderOf} proxy.
 *
 * @typeParam T - The instance type produced by the class.
 */
export interface Buildable<T> {
  new (...args: any[]): T
  /** Creates a new fluent builder for constructing instances of this class. */
  builder(): BuilderOf<T>
}
