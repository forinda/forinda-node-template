import { Resend } from 'resend'
import { Service, Autowired, PostConstruct } from '../decorators'
import { getEnv } from '../env'
import { createLogger } from '../logger'
import { DocumentService, type RenderOptions } from './document.service'

const log = createLogger('MailService')

/** Options for sending an email. */
export interface SendMailOptions {
  /** Recipient email address(es). */
  to: string | string[]
  /** Email subject line. */
  subject: string
  /** Plain-text body (optional if html is provided). */
  text?: string
  /** HTML body (optional if text is provided). */
  html?: string
  /** Sender address. Falls back to MAIL_FROM env var. */
  from?: string
  /** CC recipients. */
  cc?: string | string[]
  /** BCC recipients. */
  bcc?: string | string[]
  /** Reply-to address. */
  replyTo?: string
  /** File attachments. */
  attachments?: Array<{
    filename: string
    content: Buffer | string
    contentType?: string
  }>
}

/** Options for sending a templated email. */
export interface SendTemplateMailOptions extends Omit<SendMailOptions, 'html' | 'text'> {
  /** EJS template render options. */
  template: RenderOptions
}

/** Result of a send operation. */
export interface SendMailResult {
  /** The Resend message ID. */
  id: string
}

/**
 * Email service powered by Resend. Supports plain text, raw HTML, and
 * EJS-templated emails via the {@link DocumentService}.
 *
 * Requires `RESEND_API_KEY` to be set in the environment. The default
 * sender address is read from `MAIL_FROM`.
 *
 * @example
 * ```ts
 * @Controller()
 * class NotificationController {
 *   @Autowired() private mailService!: MailService
 *
 *   @Post('/invite')
 *   async invite(ctx: RequestContext<{ email: string }>) {
 *     await this.mailService.sendTemplate({
 *       to: ctx.body.email,
 *       subject: 'You are invited!',
 *       template: {
 *         template: 'emails/invite.ejs',
 *         data: { email: ctx.body.email },
 *       },
 *     })
 *     ctx.json({ sent: true })
 *   }
 * }
 * ```
 */
@Service()
export class MailService {
  @Autowired() private documentService!: DocumentService

  private resend!: Resend
  private defaultFrom!: string

  @PostConstruct()
  init(): void {
    const apiKey = getEnv('RESEND_API_KEY')
    if (!apiKey) {
      log.warn('RESEND_API_KEY not set — emails will fail at send time.')
    }
    this.resend = new Resend(apiKey ?? '')
    this.defaultFrom = getEnv('MAIL_FROM')
  }

  /**
   * Send an email with plain text or raw HTML body.
   *
   * @param options - The mail options (to, subject, html/text, etc.).
   * @returns The Resend message ID.
   * @throws If the Resend API returns an error.
   */
  async send(options: SendMailOptions): Promise<SendMailResult> {
    const payload: Record<string, any> = {
      from: options.from ?? this.defaultFrom,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      replyTo: options.replyTo,
    }

    if (options.html) payload.html = options.html
    if (options.text) payload.text = options.text
    if (options.cc) payload.cc = Array.isArray(options.cc) ? options.cc : [options.cc]
    if (options.bcc) payload.bcc = Array.isArray(options.bcc) ? options.bcc : [options.bcc]
    if (options.attachments) {
      payload.attachments = options.attachments.map((a) => ({
        filename: a.filename,
        content: typeof a.content === 'string' ? Buffer.from(a.content) : a.content,
        contentType: a.contentType,
      }))
    }

    const { data, error } = await this.resend.emails.send(payload as any)

    if (error) {
      throw new Error(`Failed to send email: ${error.message}`)
    }

    return { id: data!.id }
  }

  /**
   * Send an email using an EJS template for the HTML body.
   *
   * @param options - Mail options plus EJS template render options.
   * @returns The Resend message ID.
   */
  async sendTemplate(options: SendTemplateMailOptions): Promise<SendMailResult> {
    const { html } = await this.documentService.render(options.template)
    return this.send({ ...options, html })
  }
}
