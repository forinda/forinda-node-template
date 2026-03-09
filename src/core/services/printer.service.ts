import { Service, Autowired } from '../decorators'
import { DocumentService, type RenderOptions } from './document.service'

/** Page size options for PDF generation. */
export type PageSize = 'A4' | 'A3' | 'A5' | 'Letter' | 'Legal' | 'Tabloid'

/** PDF generation options. */
export interface PrintOptions {
  /** Page size. Defaults to 'A4'. */
  pageSize?: PageSize
  /** Landscape orientation. Defaults to false. */
  landscape?: boolean
  /** Print background graphics. Defaults to true. */
  printBackground?: boolean
  /** Page margins in CSS units (e.g. '1cm', '20px'). */
  margin?: {
    top?: string
    right?: string
    bottom?: string
    left?: string
  }
  /** Optional header HTML template (Puppeteer header template syntax). */
  headerTemplate?: string
  /** Optional footer HTML template (Puppeteer footer template syntax). */
  footerTemplate?: string
  /** Display header and footer. Defaults to false. */
  displayHeaderFooter?: boolean
}

/** Result of a print operation. */
export interface PrintResult {
  /** The generated PDF as a Buffer. */
  buffer: Buffer
  /** Suggested filename based on the template name. */
  filename: string
}

/**
 * Service for converting EJS templates (or raw HTML) into PDF documents
 * using Puppeteer. Works in tandem with {@link DocumentService} for the
 * full template → HTML → PDF pipeline.
 *
 * Puppeteer is lazy-loaded on first use so it doesn't slow down app startup.
 *
 * @example
 * ```ts
 * @Controller()
 * class ReportController {
 *   @Autowired() private printerService!: PrinterService
 *
 *   @Get('/invoice/:id/pdf')
 *   async invoicePdf(ctx: RequestContext<unknown, { id: string }>) {
 *     const { buffer, filename } = await this.printerService.printTemplate({
 *       template: 'reports/invoice.ejs',
 *       data: { orderId: ctx.params.id, items: [...] },
 *     })
 *     ctx.download(buffer, filename, 'application/pdf')
 *   }
 * }
 * ```
 */
@Service()
export class PrinterService {
  @Autowired() private documentService!: DocumentService

  private puppeteer: any = null

  /** Lazy-load puppeteer to avoid startup cost when not needed. */
  private async getPuppeteer() {
    if (!this.puppeteer) {
      try {
        this.puppeteer = await (Function('return import("puppeteer")')() as Promise<any>)
      } catch {
        throw new Error(
          'puppeteer is required for PDF generation. Install it with: pnpm add puppeteer',
        )
      }
    }
    return this.puppeteer
  }

  /**
   * Generate a PDF from an EJS template file.
   *
   * @param renderOptions - Template path and data for EJS rendering.
   * @param printOptions - PDF generation options (page size, margins, etc.).
   * @returns A promise resolving to the PDF buffer and suggested filename.
   */
  async printTemplate(
    renderOptions: RenderOptions,
    printOptions: PrintOptions = {},
  ): Promise<PrintResult> {
    const { html } = await this.documentService.render(renderOptions)
    const buffer = await this.htmlToPdf(html, printOptions)

    const basename = renderOptions.template.replace(/\.ejs$/, '').replace(/[/\\]/g, '-')

    return { buffer, filename: `${basename}.pdf` }
  }

  /**
   * Generate a PDF from a raw HTML string.
   *
   * @param html - The HTML content to convert.
   * @param options - PDF generation options.
   * @returns The PDF as a Buffer.
   */
  async htmlToPdf(html: string, options: PrintOptions = {}): Promise<Buffer> {
    const puppeteer = await this.getPuppeteer()
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] })

    try {
      const page = await browser.newPage()
      await page.setContent(html, { waitUntil: 'networkidle0' })

      const pdfBuffer = await page.pdf({
        format: options.pageSize ?? 'A4',
        landscape: options.landscape ?? false,
        printBackground: options.printBackground ?? true,
        margin: options.margin ?? { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' },
        displayHeaderFooter: options.displayHeaderFooter ?? false,
        headerTemplate: options.headerTemplate,
        footerTemplate: options.footerTemplate,
      })

      return Buffer.from(pdfBuffer)
    } finally {
      await browser.close()
    }
  }
}
