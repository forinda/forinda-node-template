import 'reflect-metadata'
import { z } from 'zod'
import { METADATA, type Constructor } from '../interfaces'
import type { RouteDefinition, FileUploadConfig } from '../decorators'
import { SWAGGER_METADATA, type ApiOperationOptions, type ApiResponseOptions } from './decorators'

// ─── OpenAPI Types ──────────────────────────────────────────

export interface OpenAPIInfo {
  title: string
  version: string
  description?: string
}

export interface OpenAPISpec {
  openapi: '3.0.3'
  info: OpenAPIInfo
  paths: Record<string, any>
  components: { schemas: Record<string, any>; securitySchemes?: Record<string, any> }
  tags: { name: string; description?: string }[]
  security?: Record<string, any[]>[]
}

export interface SwaggerOptions {
  info?: Partial<OpenAPIInfo>
  servers?: { url: string; description?: string }[]
  /**
   * Enable Bearer token authentication in the OpenAPI spec.
   * - `true` — adds BearerAuth security scheme and applies it globally to all operations.
   * - `false` / omitted — Bearer auth is only shown on controllers/methods with `@ApiBearerAuth()`.
   */
  bearerAuth?: boolean
}

// ─── Zod → JSON Schema ─────────────────────────────────────

function zodToJsonSchema(schema: z.ZodType): Record<string, any> {
  try {
    const jsonSchema: any = z.toJSONSchema(schema)
    // Remove the $schema field for embedding in OpenAPI
    delete jsonSchema.$schema
    return jsonSchema
  } catch {
    return { type: 'object' }
  }
}

// ─── Path Conversion ────────────────────────────────────────

/** Convert Express :param to OpenAPI {param} */
function toOpenAPIPath(expressPath: string): string {
  return expressPath.replace(/:(\w+)/g, '{$1}')
}

/** Extract param names from Express path */
function extractPathParams(path: string): string[] {
  const matches = path.match(/:(\w+)/g)
  return matches ? matches.map((m) => m.slice(1)) : []
}

// ─── Spec Builder ───────────────────────────────────────────

interface RegisteredRoute {
  controllerClass: Constructor
  mountPath: string
}

const registeredRoutes: RegisteredRoute[] = []

/**
 * Called by Application during route mounting to register controllers
 * for OpenAPI introspection.
 */
export function registerControllerForDocs(controllerClass: Constructor, mountPath: string): void {
  registeredRoutes.push({ controllerClass, mountPath })
}

/** Clear all registered routes (useful for HMR). */
export function clearRegisteredRoutes(): void {
  registeredRoutes.length = 0
}

/**
 * Build the full OpenAPI 3.0.3 specification by introspecting all registered
 * controllers, their route decorators, Zod validation schemas, and any
 * swagger override decorators (@ApiOperation, @ApiResponse, @ApiTags).
 */
export function buildOpenAPISpec(options: SwaggerOptions = {}): OpenAPISpec {
  const spec: OpenAPISpec = {
    openapi: '3.0.3',
    info: {
      title: options.info?.title ?? 'API Documentation',
      version: options.info?.version ?? '1.0.0',
      description: options.info?.description,
    },
    paths: {},
    components: { schemas: {} },
    tags: [],
  }

  if (options.servers) {
    ;(spec as any).servers = options.servers
  }

  // Track security schemes that need to be registered
  const securitySchemes = new Set<string>()

  // If bearerAuth is globally enabled, apply to all operations
  if (options.bearerAuth) {
    securitySchemes.add('BearerAuth')
    spec.security = [{ BearerAuth: [] }]
  }

  const tagSet = new Set<string>()
  let schemaCounter = 0

  function addSchema(zodSchema: z.ZodType, prefix: string): string {
    const name = `${prefix}_${++schemaCounter}`
    spec.components.schemas[name] = zodToJsonSchema(zodSchema)
    return name
  }

  for (const { controllerClass, mountPath } of registeredRoutes) {
    // Skip if controller is excluded
    if (Reflect.getMetadata(SWAGGER_METADATA.API_EXCLUDE, controllerClass)) continue

    const routes: RouteDefinition[] =
      Reflect.getMetadata(METADATA.ROUTES, controllerClass.prototype) || []

    // Class-level tags
    const classTags: string[] =
      Reflect.getMetadata(SWAGGER_METADATA.API_TAGS, controllerClass) || []

    // Default tag from controller name
    const defaultTag =
      classTags.length > 0 ? classTags[0] : controllerClass.name.replace(/Controller$/, '')

    if (!tagSet.has(defaultTag)) {
      tagSet.add(defaultTag)
      spec.tags.push({ name: defaultTag })
    }
    for (const t of classTags) {
      if (!tagSet.has(t)) {
        tagSet.add(t)
        spec.tags.push({ name: t })
      }
    }

    const controllerPath = Reflect.getMetadata(METADATA.CONTROLLER_PATH, controllerClass) ?? '/'

    for (const route of routes) {
      // Skip excluded methods
      if (
        Reflect.getMetadata(
          SWAGGER_METADATA.API_EXCLUDE,
          controllerClass.prototype,
          route.handlerName,
        )
      )
        continue

      // Build the full path
      const routePath = route.path === '/' ? '' : route.path
      const controllerPrefix = controllerPath === '/' ? '' : controllerPath
      const fullPath = `${mountPath}${controllerPrefix}${routePath}` || '/'
      const openAPIPath = toOpenAPIPath(fullPath)

      if (!spec.paths[openAPIPath]) spec.paths[openAPIPath] = {}

      // Swagger override decorators
      const operation: ApiOperationOptions =
        Reflect.getMetadata(
          SWAGGER_METADATA.API_OPERATION,
          controllerClass.prototype,
          route.handlerName,
        ) || {}

      const responseOverrides: ApiResponseOptions[] =
        Reflect.getMetadata(
          SWAGGER_METADATA.API_RESPONSE,
          controllerClass.prototype,
          route.handlerName,
        ) || []

      const methodTags: string[] =
        Reflect.getMetadata(
          SWAGGER_METADATA.API_TAGS,
          controllerClass.prototype,
          route.handlerName,
        ) || classTags

      const tags = methodTags.length > 0 ? methodTags : [defaultTag]

      // Build operation object
      const op: Record<string, any> = {
        tags,
        summary: operation.summary ?? `${route.method.toUpperCase()} ${fullPath}`,
        operationId: operation.operationId ?? `${controllerClass.name}_${route.handlerName}`,
        parameters: [],
        responses: {},
      }

      if (operation.description) op.description = operation.description
      if (operation.deprecated) op.deprecated = true

      // Bearer auth — check method-level first, then class-level
      const methodBearer: string | undefined = Reflect.getMetadata(
        SWAGGER_METADATA.API_BEARER_AUTH,
        controllerClass.prototype,
        route.handlerName,
      )
      const classBearer: string | undefined = Reflect.getMetadata(
        SWAGGER_METADATA.API_BEARER_AUTH,
        controllerClass,
      )
      const bearerName = methodBearer ?? classBearer
      if (bearerName) {
        securitySchemes.add(bearerName)
        op.security = [{ [bearerName]: [] }]
      }

      // Path parameters (from :param patterns)
      const pathParams = extractPathParams(route.path)
      for (const param of pathParams) {
        const paramDef: any = {
          name: param,
          in: 'path',
          required: true,
          schema: { type: 'string' },
        }

        // If we have a params Zod schema, try to get the type
        if (route.validation?.params) {
          const paramsSchema = zodToJsonSchema(route.validation.params)
          if (paramsSchema.properties?.[param]) {
            paramDef.schema = paramsSchema.properties[param]
          }
        }

        op.parameters.push(paramDef)
      }

      // Query parameters from Zod schema
      if (route.validation?.query) {
        const querySchema = zodToJsonSchema(route.validation.query)
        if (querySchema.properties) {
          const required = querySchema.required || []
          for (const [name, schema] of Object.entries(querySchema.properties)) {
            op.parameters.push({
              name,
              in: 'query',
              required: required.includes(name),
              schema,
            })
          }
        }
      }

      // File upload — detect @FileUpload metadata
      const fileUpload: FileUploadConfig | undefined = Reflect.getMetadata(
        METADATA.FILE_UPLOAD,
        controllerClass.prototype,
        route.handlerName,
      )

      if (fileUpload && fileUpload.mode !== 'none') {
        // Build multipart/form-data schema
        const fieldName = fileUpload.fieldName ?? 'file'
        const properties: Record<string, any> = {}
        const required: string[] = []

        if (fileUpload.mode === 'single') {
          properties[fieldName] = { type: 'string', format: 'binary' }
          required.push(fieldName)
        } else if (fileUpload.mode === 'array') {
          properties[fieldName] = {
            type: 'array',
            items: { type: 'string', format: 'binary' },
          }
          required.push(fieldName)
        }

        // If there's also a body validation schema, merge its fields
        // (multipart forms can carry both files and text fields)
        if (route.validation?.body) {
          const bodyJsonSchema = zodToJsonSchema(route.validation.body)
          if (bodyJsonSchema.properties) {
            Object.assign(properties, bodyJsonSchema.properties)
          }
          if (bodyJsonSchema.required) {
            required.push(...bodyJsonSchema.required)
          }
        }

        op.requestBody = {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties,
                ...(required.length > 0 ? { required } : {}),
              },
            },
          },
        }
      } else if (route.validation?.body) {
        // Regular JSON request body
        const schemaName = addSchema(route.validation.body, route.handlerName)
        op.requestBody = {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: `#/components/schemas/${schemaName}` },
            },
          },
        }
      }

      // Remove empty parameters array
      if (op.parameters.length === 0) delete op.parameters

      // Responses — apply overrides or defaults
      if (responseOverrides.length > 0) {
        for (const resp of responseOverrides) {
          const respObj: any = {
            description: resp.description ?? 'Response',
          }
          if (resp.schema) {
            const schemaName = addSchema(resp.schema, `${route.handlerName}_${resp.status}`)
            respObj.content = {
              'application/json': {
                schema: { $ref: `#/components/schemas/${schemaName}` },
              },
            }
          }
          op.responses[String(resp.status)] = respObj
        }
      } else {
        // Auto-generate default responses based on HTTP method
        switch (route.method) {
          case 'post':
            op.responses['201'] = { description: 'Created' }
            break
          case 'delete':
            op.responses['204'] = { description: 'No Content' }
            break
          default:
            op.responses['200'] = { description: 'Success' }
        }

        if (route.validation) {
          op.responses['422'] = { description: 'Validation Error' }
        }
      }

      spec.paths[openAPIPath][route.method] = op
    }
  }

  // Register all collected security schemes
  if (securitySchemes.size > 0) {
    spec.components.securitySchemes = {}
    for (const name of securitySchemes) {
      spec.components.securitySchemes[name] = {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      }
    }
  }

  return spec
}
