import { createLogger } from '../logger'
import { Service } from '../decorators'

const log = createLogger('AuditLog')

/**
 * Structured audit event types. Extend this union as new
 * auditable actions are introduced.
 */
export type AuditAction =
  | 'auth.login'
  | 'auth.login_failed'
  | 'auth.register'
  | 'auth.register_failed'
  | 'auth.token_expired'
  | 'auth.token_invalid'
  | 'auth.logout'
  | 'auth.password_change'
  | 'auth.avatar_upload'
  | 'user.create'
  | 'user.update'
  | 'user.delete'
  | 'user.deactivate'
  | 'resource.create'
  | 'resource.update'
  | 'resource.delete'

/**
 * Shape of an audit log entry. Every audit event produces
 * one of these, which is then handed to each registered sink.
 */
export interface AuditEntry {
  /** The action that was performed. */
  action: AuditAction
  /** Who performed the action (user ID, email, or `'anonymous'`). */
  actor: string
  /** IP address of the request originator. */
  ip?: string
  /** The resource type that was acted upon (e.g. `'user'`, `'category'`). */
  resource?: string
  /** The ID of the specific resource instance. */
  resourceId?: string
  /** Whether the action succeeded. */
  success: boolean
  /** Optional reason for failure or extra context. */
  reason?: string
  /** Arbitrary metadata (old/new values, request path, etc.). */
  meta?: Record<string, unknown>
  /** ISO 8601 timestamp. Filled automatically if omitted. */
  timestamp?: string
}

/**
 * An audit sink receives completed audit entries. Implement this
 * to persist audit data to a database, external service, file, etc.
 *
 * @example
 * ```ts
 * const dbSink: AuditSink = {
 *   name: 'database',
 *   async write(entry) {
 *     await db.insert(auditLogs).values(entry)
 *   },
 * }
 * auditService.addSink(dbSink)
 * ```
 */
export interface AuditSink {
  /** Human-readable name for logging/debugging. */
  name: string
  /** Persist or forward a single audit entry. */
  write(entry: AuditEntry): void | Promise<void>
}

/**
 * Central audit logging service. Emits structured audit entries
 * to one or more pluggable sinks. By default ships with a Pino
 * console sink so audit events are visible in logs immediately.
 *
 * Register additional sinks (database, external API, file) via
 * `addSink()` — they run in parallel and failures are isolated.
 *
 * @example
 * ```ts
 * @Service()
 * class LoginUseCase {
 *   constructor(private readonly audit: AuditService) {}
 *
 *   async execute(dto: LoginDTO) {
 *     // ...login logic...
 *     this.audit.record({
 *       action: 'auth.login',
 *       actor: user.email,
 *       ip: ctx.req.ip,
 *       success: true,
 *     })
 *   }
 * }
 * ```
 */
@Service()
export class AuditService {
  private sinks: AuditSink[] = []

  constructor() {
    // Default: log to Pino
    this.sinks.push({
      name: 'pino',
      write(entry) {
        const level = entry.success ? 'info' : 'warn'
        log[level](
          {
            action: entry.action,
            actor: entry.actor,
            ip: entry.ip,
            resource: entry.resource,
            resourceId: entry.resourceId,
            success: entry.success,
            reason: entry.reason,
            meta: entry.meta,
          },
          `AUDIT: ${entry.action}`,
        )
      },
    })
  }

  /**
   * Register an additional audit sink. Sinks are invoked in
   * parallel — a failure in one does not block others.
   */
  addSink(sink: AuditSink): void {
    this.sinks.push(sink)
  }

  /**
   * Remove a sink by name.
   */
  removeSink(name: string): void {
    this.sinks = this.sinks.filter((s) => s.name !== name)
  }

  /**
   * Record an audit event. Dispatches to all registered sinks.
   * Failures in individual sinks are caught and logged — they
   * never propagate to the caller.
   */
  record(entry: AuditEntry): void {
    const filled: AuditEntry = {
      ...entry,
      timestamp: entry.timestamp ?? new Date().toISOString(),
    }

    for (const sink of this.sinks) {
      try {
        const result = sink.write(filled)
        if (result && typeof (result as Promise<void>).catch === 'function') {
          ;(result as Promise<void>).catch((err) => {
            log.error({ err, sink: sink.name }, `Audit sink "${sink.name}" failed`)
          })
        }
      } catch (err) {
        log.error({ err, sink: sink.name }, `Audit sink "${sink.name}" failed`)
      }
    }
  }

  /**
   * Convenience: record a successful action.
   */
  success(
    action: AuditAction,
    actor: string,
    extra?: Partial<Omit<AuditEntry, 'action' | 'actor' | 'success'>>,
  ): void {
    this.record({ action, actor, success: true, ...extra })
  }

  /**
   * Convenience: record a failed action.
   */
  failure(
    action: AuditAction,
    actor: string,
    reason: string,
    extra?: Partial<Omit<AuditEntry, 'action' | 'actor' | 'success' | 'reason'>>,
  ): void {
    this.record({ action, actor, success: false, reason, ...extra })
  }
}
