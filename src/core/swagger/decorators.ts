import 'reflect-metadata'

// ─── Metadata Keys ──────────────────────────────────────────

export const SWAGGER_METADATA = {
  API_OPERATION: Symbol('swagger:operation'),
  API_RESPONSE: Symbol('swagger:response'),
  API_TAGS: Symbol('swagger:tags'),
  API_EXCLUDE: Symbol('swagger:exclude'),
} as const

// ─── Types ──────────────────────────────────────────────────

export interface ApiOperationOptions {
  summary?: string
  description?: string
  operationId?: string
  deprecated?: boolean
}

export interface ApiResponseOptions {
  status: number
  description?: string
  schema?: any
}

// ─── Decorators ─────────────────────────────────────────────

/**
 * Annotate a route handler with OpenAPI operation metadata.
 *
 * @example
 * ```ts
 * @Get('/:id')
 * @ApiOperation({ summary: 'Get user by ID', description: 'Returns a single user' })
 * async getById(ctx: RequestContext) { ... }
 * ```
 */
export function ApiOperation(options: ApiOperationOptions): MethodDecorator {
  return (target, propertyKey) => {
    Reflect.defineMetadata(SWAGGER_METADATA.API_OPERATION, options, target, propertyKey)
  }
}

/**
 * Annotate a route handler with an OpenAPI response definition.
 * Can be applied multiple times for different status codes.
 *
 * @example
 * ```ts
 * @Post('/')
 * @ApiResponse({ status: 201, description: 'User created' })
 * @ApiResponse({ status: 422, description: 'Validation error' })
 * async create(ctx: RequestContext) { ... }
 * ```
 */
export function ApiResponse(options: ApiResponseOptions): MethodDecorator {
  return (target, propertyKey) => {
    const existing: ApiResponseOptions[] =
      Reflect.getMetadata(SWAGGER_METADATA.API_RESPONSE, target, propertyKey) || []
    Reflect.defineMetadata(SWAGGER_METADATA.API_RESPONSE, [...existing, options], target, propertyKey)
  }
}

/**
 * Assign OpenAPI tags to a controller class or individual method.
 * Class-level tags apply to all routes unless overridden at method level.
 *
 * @example
 * ```ts
 * @Controller()
 * @ApiTags('Users')
 * class UserController { ... }
 * ```
 */
export function ApiTags(...tags: string[]) {
  return function (target: any, propertyKey?: string | symbol) {
    if (propertyKey !== undefined) {
      Reflect.defineMetadata(SWAGGER_METADATA.API_TAGS, tags, target, propertyKey)
    } else {
      Reflect.defineMetadata(SWAGGER_METADATA.API_TAGS, tags, target)
    }
  }
}

/**
 * Exclude a controller or specific route from the generated OpenAPI spec.
 *
 * @example
 * ```ts
 * @Get('/internal')
 * @ApiExclude()
 * async internal(ctx: RequestContext) { ... }
 * ```
 */
export function ApiExclude() {
  return function (target: any, propertyKey?: string | symbol) {
    if (propertyKey !== undefined) {
      Reflect.defineMetadata(SWAGGER_METADATA.API_EXCLUDE, true, target, propertyKey)
    } else {
      Reflect.defineMetadata(SWAGGER_METADATA.API_EXCLUDE, true, target)
    }
  }
}
