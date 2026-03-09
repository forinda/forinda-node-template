import type { Router } from 'express'
import type { Container } from './container'
import type { Constructor } from './interfaces'

/**
 * Describes the route configuration returned by an {@link AppModule}.
 */
export interface ModuleRoutes {
  /** The URL path prefix for the module (e.g., `/users`). */
  path: string
  /** The Express router containing the module's endpoint definitions. */
  router: Router
  /**
   * API version for this route set (e.g. `1`, `2`).
   * When set, the final mount path becomes `/{apiPrefix}/v{version}/{path}`.
   * When omitted, the global default version from ApplicationOptions is used.
   */
  version?: number
  /**
   * The controller class for this route set. When provided, the swagger
   * system introspects its decorators to auto-generate OpenAPI documentation.
   */
  controller?: Constructor
}

/**
 * Every feature module implements this interface.
 * The application loader calls these methods automatically.
 */
export interface AppModule {
  /** Bind interfaces to concrete implementations in the container. */
  register(container: Container): void

  /**
   * Return the module's route configuration.
   * Can return a single route set or an array for multi-version support.
   *
   * @example
   * ```ts
   * // Single version (uses global default)
   * routes(): ModuleRoutes {
   *   return { path: '/users', router: buildRoutes(UserController) }
   * }
   *
   * // Multiple versions
   * routes(): ModuleRoutes[] {
   *   return [
   *     { path: '/users', version: 1, router: buildRoutes(UserV1Controller) },
   *     { path: '/users', version: 2, router: buildRoutes(UserV2Controller) },
   *   ]
   * }
   * ```
   */
  routes(): ModuleRoutes | ModuleRoutes[]
}

/** Constructor type for AppModule classes. */
export type AppModuleClass = new () => AppModule
