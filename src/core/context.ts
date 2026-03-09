import type { Request, Response, NextFunction } from 'express'
import type { UploadedFile } from './middleware/upload'

/**
 * Request context passed to every controller method.
 * Wraps Express req/res/next and provides typed helpers
 * for common operations plus an extensible metadata store.
 */
export class RequestContext<TBody = any, TParams = any, TQuery = any> {
  /** Arbitrary metadata attached during the request lifecycle (auth user, trace ID, etc.) */
  readonly metadata: Map<string, any> = new Map()

  constructor(
    readonly req: Request,
    readonly res: Response,
    readonly next: NextFunction,
  ) {}

  /**
   * The uploaded file (set by `@FileUpload('single')` or `upload('single')` middleware).
   * `undefined` if no file was uploaded or a different upload mode was used.
   */
  get file(): UploadedFile | undefined {
    return (this.req as any).file
  }

  /**
   * Array of uploaded files (set by `@FileUpload('array')` or `upload('array')` middleware).
   * `undefined` if no files were uploaded or a different upload mode was used.
   */
  get files(): UploadedFile[] | undefined {
    const f = (this.req as any).files
    return Array.isArray(f) ? f : undefined
  }

  /** Validated request body (set by the `validate` middleware). */
  get body(): TBody {
    return this.req.body
  }

  /** Route parameters (e.g. `:id`). */
  get params(): TParams {
    return this.req.params as TParams
  }

  /** Query string parameters. */
  get query(): TQuery {
    return this.req.query as TQuery
  }

  /** Request headers. */
  get headers() {
    return this.req.headers
  }

  /** Shorthand to get a metadata value. */
  get<T = any>(key: string): T | undefined {
    return this.metadata.get(key)
  }

  /** Shorthand to set a metadata value. */
  set(key: string, value: any): this {
    this.metadata.set(key, value)
    return this
  }

  /** Send a JSON success response. */
  json(data: any, status = 200): void {
    this.res.status(status).json(data)
  }

  /** Send a 201 Created response. */
  created(data: any): void {
    this.res.status(201).json(data)
  }

  /** Send a 204 No Content response. */
  noContent(): void {
    this.res.status(204).send()
  }

  /** Send a 404 Not Found response. */
  notFound(message = 'Not found'): void {
    this.res.status(404).json({ error: message })
  }

  /** Send a 400 Bad Request response. */
  badRequest(message: string): void {
    this.res.status(400).json({ error: message })
  }

  /** Send an HTML response (e.g. rendered template). */
  html(content: string, status = 200): void {
    this.res.status(status).contentType('text/html').send(content)
  }

  /** Send a file download response. */
  download(buffer: Buffer, filename: string, contentType = 'application/octet-stream'): void {
    this.res
      .status(200)
      .contentType(contentType)
      .setHeaders(
        new Headers({
          'Content-Disposition': `attachment; filename="${filename}"`,
        }),
      )
      .send(buffer)
  }
}
