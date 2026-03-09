import { describe, it, expect, vi } from 'vitest'
import { csrf } from './csrf'
import { RequestContext } from '../context'
import type { Request, Response, NextFunction } from 'express'

function parseCookieString(str: string): Record<string, string> {
  const result: Record<string, string> = {}
  if (!str) return result
  for (const pair of str.split(';')) {
    const eqIdx = pair.indexOf('=')
    if (eqIdx === -1) continue
    const key = pair.slice(0, eqIdx).trim()
    const value = pair.slice(eqIdx + 1).trim()
    if (key) result[key] = value
  }
  return result
}

function createMockCtx(overrides: {
  method?: string
  path?: string
  headers?: Record<string, string>
  cookie?: string
}) {
  const statusFn = vi.fn().mockReturnThis()
  const jsonFn = vi.fn()
  const cookieFn = vi.fn()

  const req = {
    method: overrides.method ?? 'GET',
    path: overrides.path ?? '/',
    headers: {
      ...overrides.headers,
    },
    cookies: parseCookieString(overrides.cookie ?? ''),
    params: {},
    query: {},
    body: {},
  } as unknown as Request

  const res = {
    status: statusFn,
    json: jsonFn,
    cookie: cookieFn,
    headersSent: false,
  } as unknown as Response

  const next: NextFunction = vi.fn() as any

  return {
    ctx: new RequestContext(req, res, next),
    statusFn,
    jsonFn,
    cookieFn,
    next: next as unknown as ReturnType<typeof vi.fn>,
  }
}

describe('csrf middleware', () => {
  it('allows GET requests without a token', async () => {
    const middleware = csrf()
    const { ctx, next } = createMockCtx({ method: 'GET' })

    await middleware(ctx, next)

    expect(next).toHaveBeenCalledOnce()
  })

  it('allows HEAD requests without a token', async () => {
    const middleware = csrf()
    const { ctx, next } = createMockCtx({ method: 'HEAD' })

    await middleware(ctx, next)

    expect(next).toHaveBeenCalledOnce()
  })

  it('allows OPTIONS requests without a token', async () => {
    const middleware = csrf()
    const { ctx, next } = createMockCtx({ method: 'OPTIONS' })

    await middleware(ctx, next)

    expect(next).toHaveBeenCalledOnce()
  })

  it('sets a CSRF cookie on GET if none exists', async () => {
    const middleware = csrf()
    const { ctx, cookieFn, next } = createMockCtx({ method: 'GET' })

    await middleware(ctx, next)

    expect(cookieFn).toHaveBeenCalledOnce()
    const [name, value] = cookieFn.mock.calls[0]
    expect(name).toBe('csrf-token')
    expect(typeof value).toBe('string')
    expect(value.length).toBeGreaterThan(0)
    expect(next).toHaveBeenCalledOnce()
  })

  it('rejects POST without CSRF header', async () => {
    const middleware = csrf()
    const { ctx, statusFn, jsonFn, next } = createMockCtx({
      method: 'POST',
      cookie: 'csrf-token=abc123',
    })

    await middleware(ctx, next)

    expect(next).not.toHaveBeenCalled()
    expect(statusFn).toHaveBeenCalledWith(403)
    expect(jsonFn).toHaveBeenCalledWith({ error: 'CSRF token mismatch' })
  })

  it('rejects POST with mismatched CSRF header', async () => {
    const middleware = csrf()
    const { ctx, statusFn, next } = createMockCtx({
      method: 'POST',
      cookie: 'csrf-token=correct-token',
      headers: { 'x-csrf-token': 'wrong-token' },
    })

    await middleware(ctx, next)

    expect(next).not.toHaveBeenCalled()
    expect(statusFn).toHaveBeenCalledWith(403)
  })

  it('allows POST with matching CSRF header', async () => {
    const middleware = csrf()
    const { ctx, next } = createMockCtx({
      method: 'POST',
      cookie: 'csrf-token=valid-token',
      headers: { 'x-csrf-token': 'valid-token' },
    })

    await middleware(ctx, next)

    expect(next).toHaveBeenCalledOnce()
  })

  it('allows PUT with matching CSRF header', async () => {
    const middleware = csrf()
    const { ctx, next } = createMockCtx({
      method: 'PUT',
      cookie: 'csrf-token=my-token',
      headers: { 'x-csrf-token': 'my-token' },
    })

    await middleware(ctx, next)

    expect(next).toHaveBeenCalledOnce()
  })

  it('allows DELETE with matching CSRF header', async () => {
    const middleware = csrf()
    const { ctx, next } = createMockCtx({
      method: 'DELETE',
      cookie: 'csrf-token=del-token',
      headers: { 'x-csrf-token': 'del-token' },
    })

    await middleware(ctx, next)

    expect(next).toHaveBeenCalledOnce()
  })

  it('respects custom header and cookie names', async () => {
    const middleware = csrf({
      headerName: 'x-xsrf-token',
      cookieName: 'xsrf',
    })

    const { ctx, next } = createMockCtx({
      method: 'POST',
      cookie: 'xsrf=custom-val',
      headers: { 'x-xsrf-token': 'custom-val' },
    })

    await middleware(ctx, next)

    expect(next).toHaveBeenCalledOnce()
  })

  it('respects custom ignoreMethods', async () => {
    const middleware = csrf({ ignoreMethods: ['GET', 'POST'] })
    const { ctx, next } = createMockCtx({ method: 'POST' })

    await middleware(ctx, next)

    expect(next).toHaveBeenCalledOnce()
  })

  it('does not skip cookie when none exists on POST', async () => {
    const middleware = csrf()
    const { ctx, cookieFn, statusFn, next } = createMockCtx({
      method: 'POST',
      headers: { 'x-csrf-token': 'some-token' },
    })

    await middleware(ctx, next)

    // Cookie is set with a new token, but POST is rejected since
    // the header won't match the newly generated cookie token
    expect(cookieFn).toHaveBeenCalledOnce()
    expect(next).not.toHaveBeenCalled()
    expect(statusFn).toHaveBeenCalledWith(403)
  })
})
