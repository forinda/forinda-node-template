import 'reflect-metadata'
import { z } from 'zod'
import { Container } from './container'
import type { RequestContext } from './context'
import {
  Scope,
  METADATA,
  TRANSACTION_MANAGER,
  type Constructor,
  type ServiceOptions,
  type BeanOptions,
  type BuilderOf,
  type TransactionManager,
} from './interfaces'

/** @internal Route metadata stored by HTTP method decorators. */
export interface RouteDefinition {
  method: 'get' | 'post' | 'put' | 'delete' | 'patch'
  path: string
  handlerName: string
  validation?: {
    body?: z.ZodType
    query?: z.ZodType
    params?: z.ZodType
  }
}

/**
 * Base class decorator that marks a class for dependency injection.
 * Registers the class in the global {@link Container} with the specified lifecycle scope.
 *
 * @param options - Optional configuration including the lifecycle scope.
 * @returns A class decorator function.
 *
 * @example
 * ```ts
 * @Injectable({ scope: Scope.TRANSIENT })
 * class MyHelper { }
 * ```
 */
export function Injectable(options?: ServiceOptions): ClassDecorator {
  return function (target: any) {
    const scope = options?.scope ?? Scope.SINGLETON
    Reflect.defineMetadata(METADATA.INJECTABLE, true, target)
    Reflect.defineMetadata(METADATA.SCOPE, scope, target)
    Container.getInstance().register(target, target, scope)
  }
}

/**
 * Marks a class as a business-logic service. Registers it as a singleton by default.
 * This is a semantic alias for {@link Injectable} intended for service-layer classes.
 *
 * @param options - Optional configuration including the lifecycle scope.
 * @returns A class decorator function.
 *
 * @example
 * ```ts
 * @Service()
 * class UserService { }
 * ```
 */
export function Service(options?: ServiceOptions): ClassDecorator {
  return Injectable({ scope: Scope.SINGLETON, ...options })
}

/**
 * Marks a class as a generic managed component. Registers it as a singleton by default.
 * Use this for classes that do not fit the service, controller, or repository categories.
 *
 * @param options - Optional configuration including the lifecycle scope.
 * @returns A class decorator function.
 *
 * @example
 * ```ts
 * @Component()
 * class EmailSender { }
 * ```
 */
export function Component(options?: ServiceOptions): ClassDecorator {
  return Injectable({ scope: Scope.SINGLETON, ...options })
}

/**
 * Marks a class as an HTTP / route controller. Registers it as a singleton by default.
 * Optionally accepts a route path prefix for use with `buildRoutes()`.
 *
 * @param pathOrOptions - A route prefix string (e.g. '/users') or ServiceOptions.
 * @returns A class decorator function.
 *
 * @example
 * ```ts
 * @Controller('/users')
 * class UserController {
 *   @Get('/')
 *   async list(ctx: RequestContext) { ... }
 * }
 * ```
 */
export function Controller(pathOrOptions?: string | ServiceOptions): ClassDecorator {
  const path = typeof pathOrOptions === 'string' ? pathOrOptions : undefined
  const options = typeof pathOrOptions === 'object' ? pathOrOptions : undefined

  return function (target: any) {
    if (path !== undefined) {
      Reflect.defineMetadata(METADATA.CONTROLLER_PATH, path, target)
    }
    Injectable({ scope: Scope.SINGLETON, ...options })(target)
  }
}

/**
 * Marks a class as a data-access repository. Registers it as a singleton by default.
 * Use this decorator on classes responsible for database queries and persistence.
 *
 * @param options - Optional configuration including the lifecycle scope.
 * @returns A class decorator function.
 *
 * @example
 * ```ts
 * @Repository()
 * class UserRepository { }
 * ```
 */
export function Repository(options?: ServiceOptions): ClassDecorator {
  return Injectable({ scope: Scope.SINGLETON, ...options })
}

/**
 * Declares a class as a configuration provider containing `@Bean` factory methods.
 * During container bootstrap, each `@Bean` method is invoked and its return value
 * is registered as a dependency in the container.
 *
 * @returns A class decorator function.
 *
 * @example
 * ```ts
 * @Configuration()
 * class AppConfig {
 *   @Bean()
 *   createLogger(): Logger {
 *     return new ConsoleLogger();
 *   }
 * }
 * ```
 */
export function Configuration(): ClassDecorator {
  return function (target: any) {
    Reflect.defineMetadata(METADATA.INJECTABLE, true, target)
    Reflect.defineMetadata(METADATA.CONFIGURATION, true, target)
    Reflect.defineMetadata(METADATA.SCOPE, Scope.SINGLETON, target)
    Container.getInstance().register(target, target, Scope.SINGLETON)
  }
}

/**
 * Marks a method inside a `@Configuration` class as a bean factory.
 * The container will call this method to produce and register the dependency
 * using the method's return type as the DI token.
 *
 * @param options - Optional configuration including the lifecycle scope for the produced bean.
 * @returns A method decorator function.
 *
 * @example
 * ```ts
 * @Bean({ scope: Scope.TRANSIENT })
 * createConnection(): DatabaseConnection {
 *   return new DatabaseConnection(this.config);
 * }
 * ```
 */
export function Bean(options?: BeanOptions): MethodDecorator {
  return function (target: any, propertyKey: string | symbol, _descriptor: PropertyDescriptor) {
    const beans: string[] = Reflect.getMetadata(METADATA.BEAN, target) || []
    beans.push(propertyKey as string)
    Reflect.defineMetadata(METADATA.BEAN, beans, target)
    if (options) {
      Reflect.defineMetadata(METADATA.BEAN_OPTIONS, options, target, propertyKey)
    }
  }
}

/**
 * Property injection decorator that resolves a dependency from the container
 * and assigns it to the decorated property during instance creation.
 * If no explicit token is provided, the property's design-time type is used.
 *
 * @param token - Optional DI token (class, symbol, or string) to resolve. Defaults to the property's type.
 * @returns A property decorator function.
 *
 * @example
 * ```ts
 * class OrderService {
 *   @Autowired()
 *   private userService!: UserService;
 * }
 * ```
 */
export function Autowired(token?: any): PropertyDecorator {
  return function (target: any, propertyKey: string | symbol) {
    const type = token || Reflect.getMetadata(METADATA.PROPERTY_TYPE, target, propertyKey)
    const props: Map<string, any> = Reflect.getMetadata(METADATA.AUTOWIRED, target) || new Map()
    props.set(propertyKey as string, type)
    Reflect.defineMetadata(METADATA.AUTOWIRED, props, target)
  }
}

/**
 * Constructor-parameter injection decorator that uses an explicit token
 * to resolve the dependency. This is necessary when injecting interfaces
 * or symbol-based tokens that cannot be inferred from TypeScript type metadata.
 *
 * @param token - The DI token (symbol, class, or string) to resolve for this parameter.
 * @returns A parameter decorator function.
 *
 * @example
 * ```ts
 * class PaymentService {
 *   constructor(@Inject(PAYMENT_GATEWAY) private gateway: PaymentGateway) {}
 * }
 * ```
 */
export function Inject(token: any): ParameterDecorator {
  return function (target: any, _propertyKey: string | symbol | undefined, parameterIndex: number) {
    const overrides: Map<number, any> = Reflect.getMetadata(METADATA.INJECT, target) || new Map()
    overrides.set(parameterIndex, token)
    Reflect.defineMetadata(METADATA.INJECT, overrides, target)
  }
}

/**
 * Injects an environment variable or configuration value into a class property.
 * The value is read lazily from `process.env` each time the property is accessed.
 *
 * @param envKey - The environment variable name to look up.
 * @param defaultValue - A fallback value if the environment variable is not set.
 * @returns A property decorator function.
 *
 * @example
 * ```ts
 * class AppConfig {
 *   @Value('DATABASE_URL', 'postgres://localhost/dev')
 *   dbUrl!: string;
 * }
 * ```
 */
export function Value(envKey: string, defaultValue?: any): PropertyDecorator {
  return function (target: any, propertyKey: string | symbol) {
    Object.defineProperty(target, propertyKey, {
      get() {
        return process.env[envKey] ?? defaultValue
      },
      enumerable: true,
      configurable: true,
    })
  }
}

/**
 * Lifecycle hook decorator that designates a method to be called automatically
 * after the instance is created and all dependencies have been injected.
 * Only one method per class should be decorated with `@PostConstruct`.
 *
 * @returns A method decorator function.
 *
 * @example
 * ```ts
 * @Service()
 * class CacheService {
 *   @PostConstruct()
 *   async initialize() {
 *     await this.warmUpCache();
 *   }
 * }
 * ```
 */
export function PostConstruct(): MethodDecorator {
  return function (target: any, propertyKey: string | symbol, _descriptor: PropertyDescriptor) {
    Reflect.defineMetadata(METADATA.POST_CONSTRUCT, propertyKey, target)
  }
}

/**
 * Lombok-style class decorator that adds a static `builder()` method to the class.
 * The builder returns a fluent proxy where each property name becomes a setter
 * method that returns the builder for chaining. Call `build()` to create the final instance.
 *
 * @typeParam T - The constructor type of the decorated class.
 * @param target - The class constructor to enhance with the builder pattern.
 * @returns The original class with an added static `builder()` method.
 *
 * @example
 * ```ts
 * @Builder
 * class User {
 *   name!: string;
 *   age!: number;
 * }
 *
 * const user = (User as Buildable<User>).builder().name('Alice').age(30).build();
 * ```
 */
export function Builder<T extends Constructor>(target: T): T {
  ;(target as any).builder = function (): BuilderOf<InstanceType<T>> {
    const props: Record<string, any> = {}
    const proxy: any = new Proxy(
      {},
      {
        get(_, prop: string) {
          if (prop === 'build') {
            return () => Object.assign(new target(), props)
          }
          return (value: any) => {
            props[prop] = value
            return proxy
          }
        },
      },
    )
    return proxy
  }

  Reflect.defineMetadata(METADATA.BUILDER, true, target)
  return target
}

/**
 * Method decorator that wraps the decorated method in a database transaction.
 * Automatically begins a transaction before execution, commits on success,
 * and rolls back on error. Requires a {@link TransactionManager} implementation
 * to be registered in the container under the `TRANSACTION_MANAGER` token.
 *
 * @returns A method decorator function.
 * @throws Re-throws the original error after performing a rollback.
 *
 * @example
 * ```ts
 * @Service()
 * class OrderService {
 *   @Transactional()
 *   async placeOrder(order: Order): Promise<void> {
 *     await this.orderRepo.save(order);
 *     await this.inventoryRepo.decrement(order.items);
 *   }
 * }
 * ```
 */
export function Transactional(): MethodDecorator {
  return function (_target: any, _propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    const original = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const container = Container.getInstance()
      const txManager = container.resolve<TransactionManager>(TRANSACTION_MANAGER)
      const tx = await txManager.begin()
      try {
        const result = await original.apply(this, args)
        await txManager.commit(tx)
        return result
      } catch (error) {
        await txManager.rollback(tx)
        throw error
      }
    }

    return descriptor
  }
}

// ─── Middleware Decorator ─────────────────────────────────────

/**
 * A middleware function that receives the {@link RequestContext} and a `next`
 * callback. Call `next()` to continue to the next middleware / route handler,
 * or respond directly on `ctx` to short-circuit the chain.
 *
 * @example
 * ```ts
 * const authGuard: MiddlewareHandler = async (ctx, next) => {
 *   if (!ctx.headers.authorization) return ctx.res.status(401).json({ error: 'Unauthorized' })
 *   next()
 * }
 * ```
 */
export type MiddlewareHandler = (ctx: RequestContext, next: () => void) => void | Promise<void>

/**
 * Attaches middleware to a controller **class** (applies to every route) or to
 * an individual **method** (applies only to that route).
 *
 * Middleware functions receive a {@link RequestContext} and a `next` callback,
 * keeping the same context-based API as route handlers.
 *
 * @param handlers - One or more {@link MiddlewareHandler} functions.
 *
 * @example
 * ```ts
 * // Class-level – runs before every route in this controller
 * @Controller()
 * @Middleware(authGuard, logRequest)
 * class OrderController { ... }
 *
 * // Method-level – runs only before this specific route
 * @Get('/:id')
 * @Middleware(cacheResponse)
 * async getById(ctx: RequestContext) { ... }
 * ```
 */
export function Middleware(...handlers: MiddlewareHandler[]) {
  return function (target: any, propertyKey?: string | symbol, _descriptor?: PropertyDescriptor) {
    if (propertyKey !== undefined) {
      // Method-level middleware
      const existing: MiddlewareHandler[] =
        Reflect.getMetadata(METADATA.METHOD_MIDDLEWARES, target, propertyKey) || []
      Reflect.defineMetadata(
        METADATA.METHOD_MIDDLEWARES,
        [...existing, ...handlers],
        target,
        propertyKey,
      )
    } else {
      // Class-level middleware
      const existing: MiddlewareHandler[] =
        Reflect.getMetadata(METADATA.CLASS_MIDDLEWARES, target) || []
      Reflect.defineMetadata(METADATA.CLASS_MIDDLEWARES, [...existing, ...handlers], target)
    }
  }
}

// ─── HTTP Method Decorators ──────────────────────────────────

type ValidationSchemas = {
  body?: z.ZodType
  query?: z.ZodType
  params?: z.ZodType
}

function createRouteDecorator(method: RouteDefinition['method']) {
  return function (path = '/', validation?: ValidationSchemas): MethodDecorator {
    return function (target: any, propertyKey: string | symbol, _descriptor: PropertyDescriptor) {
      const routes: RouteDefinition[] = Reflect.getMetadata(METADATA.ROUTES, target) || []
      routes.push({
        method,
        path,
        handlerName: propertyKey as string,
        validation,
      })
      Reflect.defineMetadata(METADATA.ROUTES, routes, target)
    }
  }
}

/**
 * Registers a GET route handler on a controller method.
 *
 * @param path - The route path (e.g. '/' or '/:id'). Defaults to '/'.
 * @param validation - Optional Zod schemas for query/params validation.
 *
 * @example
 * ```ts
 * @Get('/:id')
 * async getById(ctx: RequestContext) { ... }
 * ```
 */
export const Get = createRouteDecorator('get')

/**
 * Registers a POST route handler on a controller method.
 *
 * @param path - The route path. Defaults to '/'.
 * @param validation - Optional Zod schemas for body/query/params validation.
 *
 * @example
 * ```ts
 * @Post('/', { body: createUserSchema })
 * async create(ctx: RequestContext<CreateUserDTO>) { ... }
 * ```
 */
export const Post = createRouteDecorator('post')

/**
 * Registers a PUT route handler on a controller method.
 *
 * @param path - The route path. Defaults to '/'.
 * @param validation - Optional Zod schemas for body/query/params validation.
 *
 * @example
 * ```ts
 * @Put('/:id', { body: updateUserSchema })
 * async update(ctx: RequestContext<UpdateUserDTO, { id: string }>) { ... }
 * ```
 */
export const Put = createRouteDecorator('put')

/**
 * Registers a DELETE route handler on a controller method.
 *
 * @param path - The route path. Defaults to '/'.
 * @param validation - Optional Zod schemas for params validation.
 *
 * @example
 * ```ts
 * @Delete('/:id')
 * async delete(ctx: RequestContext) { ... }
 * ```
 */
export const Delete = createRouteDecorator('delete')

/**
 * Registers a PATCH route handler on a controller method.
 *
 * @param path - The route path. Defaults to '/'.
 * @param validation - Optional Zod schemas for body/query/params validation.
 */
export const Patch = createRouteDecorator('patch')
