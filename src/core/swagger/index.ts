/**
 * @module swagger
 * Auto-generates OpenAPI 3.0 documentation from route decorators and Zod schemas.
 * Provides Swagger UI and ReDoc endpoints.
 */
export {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiExclude,
  type ApiOperationOptions,
  type ApiResponseOptions,
} from './decorators'

export {
  buildOpenAPISpec,
  registerControllerForDocs,
  clearRegisteredRoutes,
  type OpenAPIInfo,
  type OpenAPISpec,
  type SwaggerOptions,
} from './openapi-builder'

export { swaggerUIHtml, redocHtml } from './ui'
