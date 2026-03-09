/**
 * @module core
 * Public API for the core framework. Re-exports the DI container, application
 * bootstrap, decorators, interfaces, adapters, and environment utilities.
 */
export { Container } from './container'
export { Application, type ApplicationOptions } from './application'
export { type AppModule, type AppModuleClass, type ModuleRoutes } from './app-module'
export {
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
  Builder,
  Transactional,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  type RouteDefinition,
  Middleware,
  type MiddlewareHandler,
  FileUpload,
  type FileUploadConfig,
} from './decorators'
export {
  Scope,
  TRANSACTION_MANAGER,
  METADATA,
  type Constructor,
  type ServiceOptions,
  type BeanOptions,
  type TransactionManager,
  type BuilderOf,
  type Buildable,
} from './interfaces'
export {
  type AppAdapter,
  type AppAdapterClass,
  SocketAdapter,
  SOCKET_IO,
  type SocketAdapterOptions,
  type SocketEventHandler,
  RedisAdapter,
  REDIS,
  REDIS_SUBSCRIBER,
  type RedisAdapterOptions,
  SwaggerAdapter,
  type SwaggerAdapterOptions,
  DatabaseAdapter,
  DATABASE,
} from './adapters'
export { envSchema, loadEnv, getEnv, type Env } from './env'
export { validate } from './middleware/validate'
export { upload, cleanupFiles, type UploadedFile, type UploadOptions } from './middleware/upload'
export { RequestContext } from './context'
export { buildRoutes, getControllerPath } from './router-builder'
export { Logger, createLogger, logger } from './logger'
export { ConfigService } from './config.service'
export {
  DocumentService,
  type RenderOptions,
  type RenderResult,
  PrinterService,
  type PrintOptions,
  type PrintResult,
  type PageSize,
  MailService,
  type SendMailOptions,
  type SendTemplateMailOptions,
  type SendMailResult,
  DatabaseService,
  DrizzleTransactionManager,
  type DatabaseOptions,
  type DrizzleTransaction,
} from './services'
export {
  type FilterOperator,
  type FilterItem,
  type SortDirection,
  type SortItem,
  type PaginationParams,
  type ParsedQuery,
  type QueryFieldConfig,
  standardQuerySchema,
  type StandardQueryInput,
  parseFilters,
  parseSort,
  parsePagination,
  parseSearchQuery,
  parseQuery,
  buildFilterParams,
  buildQueryParams,
  type ColumnMap,
  type DrizzleQueryConfig,
  type DrizzleQueryResult,
  buildDrizzleFilters,
  buildDrizzleSearch,
  buildDrizzleSort,
  buildDrizzleQuery,
} from './query'
export {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiExclude,
  ApiBearerAuth,
  type ApiOperationOptions,
  type ApiResponseOptions,
  type OpenAPIInfo,
  type OpenAPISpec,
  type SwaggerOptions,
} from './swagger'
