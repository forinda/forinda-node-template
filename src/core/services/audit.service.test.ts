import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Container } from '../container'
import { AuditService, type AuditEntry, type AuditSink } from './audit.service'

describe('AuditService', () => {
  let audit: AuditService

  beforeEach(() => {
    Container.reset()
    const container = Container.getInstance()
    container.register(AuditService, AuditService)
    audit = container.resolve(AuditService)
  })

  it('records an audit entry via the default pino sink', () => {
    // Should not throw
    audit.record({
      action: 'auth.login',
      actor: 'user@test.com',
      success: true,
    })
  })

  it('dispatches to custom sinks', () => {
    const writeFn = vi.fn()
    const sink: AuditSink = { name: 'test', write: writeFn }
    audit.addSink(sink)

    audit.record({
      action: 'auth.login',
      actor: 'user@test.com',
      ip: '127.0.0.1',
      success: true,
    })

    expect(writeFn).toHaveBeenCalledOnce()
    const entry: AuditEntry = writeFn.mock.calls[0][0]
    expect(entry.action).toBe('auth.login')
    expect(entry.actor).toBe('user@test.com')
    expect(entry.ip).toBe('127.0.0.1')
    expect(entry.success).toBe(true)
    expect(entry.timestamp).toBeDefined()
  })

  it('fills timestamp automatically', () => {
    const writeFn = vi.fn()
    audit.addSink({ name: 'test', write: writeFn })

    audit.record({
      action: 'auth.register',
      actor: 'new@test.com',
      success: true,
    })

    const entry: AuditEntry = writeFn.mock.calls[0][0]
    expect(entry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('preserves explicit timestamp', () => {
    const writeFn = vi.fn()
    audit.addSink({ name: 'test', write: writeFn })

    const ts = '2025-01-01T00:00:00.000Z'
    audit.record({
      action: 'auth.login',
      actor: 'user@test.com',
      success: true,
      timestamp: ts,
    })

    expect(writeFn.mock.calls[0][0].timestamp).toBe(ts)
  })

  it('success() convenience method sets success=true', () => {
    const writeFn = vi.fn()
    audit.addSink({ name: 'test', write: writeFn })

    audit.success('auth.login', 'user@test.com', {
      ip: '10.0.0.1',
      resource: 'session',
    })

    const entry: AuditEntry = writeFn.mock.calls[0][0]
    expect(entry.success).toBe(true)
    expect(entry.ip).toBe('10.0.0.1')
    expect(entry.resource).toBe('session')
  })

  it('failure() convenience method sets success=false and reason', () => {
    const writeFn = vi.fn()
    audit.addSink({ name: 'test', write: writeFn })

    audit.failure('auth.login_failed', 'unknown@test.com', 'Invalid password', {
      ip: '10.0.0.1',
    })

    const entry: AuditEntry = writeFn.mock.calls[0][0]
    expect(entry.success).toBe(false)
    expect(entry.reason).toBe('Invalid password')
    expect(entry.actor).toBe('unknown@test.com')
  })

  it('dispatches to multiple sinks', () => {
    const write1 = vi.fn()
    const write2 = vi.fn()
    audit.addSink({ name: 'sink1', write: write1 })
    audit.addSink({ name: 'sink2', write: write2 })

    audit.record({
      action: 'user.create',
      actor: 'admin@test.com',
      success: true,
    })

    expect(write1).toHaveBeenCalledOnce()
    expect(write2).toHaveBeenCalledOnce()
  })

  it('isolates sink failures — other sinks still execute', () => {
    const failingSink: AuditSink = {
      name: 'failing',
      write: () => {
        throw new Error('sink exploded')
      },
    }
    const successSink = vi.fn()
    audit.addSink(failingSink)
    audit.addSink({ name: 'success', write: successSink })

    // Should not throw
    audit.record({
      action: 'auth.login',
      actor: 'user@test.com',
      success: true,
    })

    expect(successSink).toHaveBeenCalledOnce()
  })

  it('isolates async sink failures', () => {
    const failingSink: AuditSink = {
      name: 'async-failing',
      write: () => Promise.reject(new Error('async fail')),
    }
    const successSink = vi.fn()
    audit.addSink(failingSink)
    audit.addSink({ name: 'success', write: successSink })

    // Should not throw
    audit.record({
      action: 'auth.login',
      actor: 'user@test.com',
      success: true,
    })

    expect(successSink).toHaveBeenCalledOnce()
  })

  it('removeSink() removes a sink by name', () => {
    const writeFn = vi.fn()
    audit.addSink({ name: 'removable', write: writeFn })
    audit.removeSink('removable')

    audit.record({
      action: 'auth.login',
      actor: 'user@test.com',
      success: true,
    })

    expect(writeFn).not.toHaveBeenCalled()
  })

  it('includes meta and resource fields', () => {
    const writeFn = vi.fn()
    audit.addSink({ name: 'test', write: writeFn })

    audit.record({
      action: 'resource.update',
      actor: 'admin@test.com',
      resource: 'category',
      resourceId: 'cat-123',
      success: true,
      meta: { oldName: 'Books', newName: 'E-Books' },
    })

    const entry: AuditEntry = writeFn.mock.calls[0][0]
    expect(entry.resource).toBe('category')
    expect(entry.resourceId).toBe('cat-123')
    expect(entry.meta).toEqual({ oldName: 'Books', newName: 'E-Books' })
  })
})
