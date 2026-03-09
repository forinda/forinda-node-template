import 'reflect-metadata'
import multer from 'multer'
import { Router, type Request, type Response, type NextFunction } from 'express'
import { Container } from './container'
import { METADATA, type Constructor } from './interfaces'
import { validate } from './middleware/validate'
import { upload, cleanupFiles, resolveMimeTypes } from './middleware/upload'
import { RequestContext } from './context'
import type { RouteDefinition, MiddlewareHandler, FileUploadConfig } from './decorators'

/**
 * Reads `@Get`, `@Post`, `@Put`, `@Delete`, `@Patch` metadata from a
 * `@Controller` class and builds an Express Router automatically.
 *
 * @param controllerClass - The controller class decorated with route decorators.
 * @returns An Express Router with all routes wired up.
 *
 * @example
 * ```ts
 * // In your module:
 * routes(): ModuleRoutes {
 *   return { path: '/api/users', router: buildRoutes(UserController) }
 * }
 * ```
 */
export function buildRoutes(controllerClass: Constructor): Router {
  const router = Router()
  const controller = Container.getInstance().resolve(controllerClass)
  const routes: RouteDefinition[] =
    Reflect.getMetadata(METADATA.ROUTES, controllerClass.prototype) || []

  // Class-level @Middleware handlers (apply to every route)
  const classMiddlewares: MiddlewareHandler[] =
    Reflect.getMetadata(METADATA.CLASS_MIDDLEWARES, controllerClass) || []

  for (const route of routes) {
    const expressMiddlewares: any[] = []

    // File upload middleware (must come before validation so multipart is parsed)
    const uploadConfig: FileUploadConfig | undefined = Reflect.getMetadata(
      METADATA.FILE_UPLOAD,
      controllerClass.prototype,
      route.handlerName,
    )
    if (uploadConfig) {
      const maxSize = uploadConfig.maxSize ?? 5 * 1024 * 1024 // default 5 MB
      const multerOpts: any = { limits: { fileSize: maxSize } }
      if (uploadConfig.allowedMimeTypes) {
        const allowed = resolveMimeTypes(uploadConfig.allowedMimeTypes)
        multerOpts.fileFilter = (
          _req: Request,
          file: Express.Multer.File,
          cb: multer.FileFilterCallback,
        ) => {
          if (allowed.includes(file.mimetype)) {
            cb(null, true)
          } else {
            cb(new Error(`File type ${file.mimetype} is not allowed`))
          }
        }
      }
      expressMiddlewares.push(
        upload(uploadConfig.mode, {
          fieldName: uploadConfig.fieldName,
          maxCount: uploadConfig.maxCount,
          multerOptions: multerOpts,
        }),
      )
      expressMiddlewares.push(cleanupFiles())
    }

    // Add validation middleware if schemas are defined
    if (route.validation) {
      expressMiddlewares.push(validate(route.validation))
    }

    // Method-level @Middleware handlers
    const methodMiddlewares: MiddlewareHandler[] =
      Reflect.getMetadata(
        METADATA.METHOD_MIDDLEWARES,
        controllerClass.prototype,
        route.handlerName,
      ) || []

    // Combine class + method middlewares, then the route handler
    const allMiddlewares = [...classMiddlewares, ...methodMiddlewares]

    // Wrap each MiddlewareHandler into Express middleware
    for (const mw of allMiddlewares) {
      expressMiddlewares.push((req: Request, res: Response, next: NextFunction) => {
        const ctx = new RequestContext(req, res, next)
        Promise.resolve(mw(ctx, next)).catch(next)
      })
    }

    // Wrap the final handler to create RequestContext and handle errors
    const handler = async (req: Request, res: Response, next: NextFunction) => {
      try {
        await controller[route.handlerName](new RequestContext(req, res, next))
      } catch (err: any) {
        res.status(400).json({ error: err.message })
      }
    }

    router[route.method](route.path, ...expressMiddlewares, handler)
  }

  return router
}

/**
 * Reads the path prefix set by `@Controller('/path')`.
 * Returns `'/'` if no path was specified.
 */
export function getControllerPath(controllerClass: Constructor): string {
  return Reflect.getMetadata(METADATA.CONTROLLER_PATH, controllerClass) ?? '/'
}
