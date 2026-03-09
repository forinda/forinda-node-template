import path from 'node:path'
import ejs from 'ejs'
import { Service } from '../decorators'

/** Options for rendering a document template. */
export interface RenderOptions {
  /** Template file path relative to the templates root directory. */
  template: string
  /** Data to inject into the EJS template. */
  data?: Record<string, any>
  /** Optional override for the templates root directory. */
  templatesDir?: string
}

/** Result of a document render operation. */
export interface RenderResult {
  /** The rendered HTML string. */
  html: string
  /** The template file that was rendered. */
  template: string
}

/**
 * Service for rendering EJS templates into HTML, intended for generating
 * reports, invoices, emails, and other document-style output.
 *
 * By default, templates are resolved from `<project-root>/templates`.
 * Override per-call with `RenderOptions.templatesDir` or globally via
 * `setTemplatesDir()`.
 *
 * @example
 * ```ts
 * @Controller()
 * class ReportController {
 *   @Autowired() private documentService!: DocumentService
 *
 *   @Get('/invoice/:id')
 *   async invoice(ctx: RequestContext<unknown, { id: string }>) {
 *     const { html } = await this.documentService.render({
 *       template: 'reports/invoice.ejs',
 *       data: { orderId: ctx.params.id, items: [...] },
 *     })
 *     ctx.html(html)
 *   }
 * }
 * ```
 */
@Service()
export class DocumentService {
  private templatesDir: string = path.resolve(__dirname, '..', '..', 'templates')

  /**
   * Override the default templates root directory.
   * @param dir - Absolute path to the templates directory.
   */
  setTemplatesDir(dir: string): void {
    this.templatesDir = dir
  }

  /** Returns the current templates root directory. */
  getTemplatesDir(): string {
    return this.templatesDir
  }

  /**
   * Render an EJS template file to an HTML string.
   *
   * @param options - The template path, data, and optional directory override.
   * @returns A promise resolving to the rendered HTML and metadata.
   * @throws If the template file cannot be found or contains syntax errors.
   */
  async render(options: RenderOptions): Promise<RenderResult> {
    const root = options.templatesDir ?? this.templatesDir
    const templatePath = path.resolve(root, options.template)

    const html = await ejs.renderFile(templatePath, options.data ?? {}, {
      async: true,
      root,
    })

    return { html, template: options.template }
  }

  /**
   * Render an EJS template from a raw string (no file lookup).
   * Useful for dynamic or database-stored templates.
   *
   * @param templateString - The raw EJS template string.
   * @param data - Data to inject into the template.
   * @returns The rendered HTML string.
   */
  async renderString(templateString: string, data: Record<string, any> = {}): Promise<string> {
    return ejs.render(templateString, data, { async: true })
  }
}
