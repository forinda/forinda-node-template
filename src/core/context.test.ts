import { describe, it, expect, vi } from 'vitest'
import { RequestContext } from './context'

function createMockContext(
  overrides: {
    body?: any
    params?: any
    query?: any
    headers?: any
    file?: any
    files?: any
  } = {},
) {
  const req: any = {
    body: overrides.body ?? {},
    params: overrides.params ?? {},
    query: overrides.query ?? {},
    headers: overrides.headers ?? {},
    file: overrides.file,
    files: overrides.files,
  }
  const res: any = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    contentType: vi.fn().mockReturnThis(),
    setHeaders: vi.fn().mockReturnThis(),
  }
  const next = vi.fn()
  return { ctx: new RequestContext(req, res, next), req, res, next }
}

describe('RequestContext', () => {
  describe('accessors', () => {
    it('should expose body, params, query, headers from req', () => {
      const { ctx } = createMockContext({
        body: { name: 'John' },
        params: { id: '123' },
        query: { page: '1' },
        headers: { authorization: 'Bearer token' },
      })

      expect(ctx.body).toEqual({ name: 'John' })
      expect(ctx.params).toEqual({ id: '123' })
      expect(ctx.query).toEqual({ page: '1' })
      expect(ctx.headers.authorization).toBe('Bearer token')
    })

    it('should expose file from req', () => {
      const file = { originalname: 'photo.jpg', size: 1024 }
      const { ctx } = createMockContext({ file })
      expect(ctx.file).toBe(file)
    })

    it('should return undefined for files when not an array', () => {
      const { ctx } = createMockContext({ files: 'not-an-array' })
      expect(ctx.files).toBeUndefined()
    })

    it('should return files array', () => {
      const files = [{ originalname: 'a.jpg' }, { originalname: 'b.jpg' }]
      const { ctx } = createMockContext({ files })
      expect(ctx.files).toEqual(files)
    })
  })

  describe('metadata store', () => {
    it('should set and get metadata', () => {
      const { ctx } = createMockContext()
      ctx.set('userId', '42')
      expect(ctx.get('userId')).toBe('42')
    })

    it('should return undefined for missing metadata keys', () => {
      const { ctx } = createMockContext()
      expect(ctx.get('missing')).toBeUndefined()
    })

    it('should support chaining on set', () => {
      const { ctx } = createMockContext()
      const result = ctx.set('a', 1).set('b', 2)
      expect(result).toBe(ctx)
      expect(ctx.get('a')).toBe(1)
      expect(ctx.get('b')).toBe(2)
    })
  })

  describe('response helpers', () => {
    it('json() should send 200 JSON response by default', () => {
      const { ctx, res } = createMockContext()
      ctx.json({ ok: true })
      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({ ok: true })
    })

    it('json() should accept custom status', () => {
      const { ctx, res } = createMockContext()
      ctx.json({ data: [] }, 206)
      expect(res.status).toHaveBeenCalledWith(206)
    })

    it('created() should send 201', () => {
      const { ctx, res } = createMockContext()
      ctx.created({ id: '1' })
      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.json).toHaveBeenCalledWith({ id: '1' })
    })

    it('noContent() should send 204', () => {
      const { ctx, res } = createMockContext()
      ctx.noContent()
      expect(res.status).toHaveBeenCalledWith(204)
      expect(res.send).toHaveBeenCalled()
    })

    it('notFound() should send 404 with default message', () => {
      const { ctx, res } = createMockContext()
      ctx.notFound()
      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith({ error: 'Not found' })
    })

    it('notFound() should accept custom message', () => {
      const { ctx, res } = createMockContext()
      ctx.notFound('User not found')
      expect(res.json).toHaveBeenCalledWith({ error: 'User not found' })
    })

    it('badRequest() should send 400', () => {
      const { ctx, res } = createMockContext()
      ctx.badRequest('Invalid input')
      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid input' })
    })

    it('html() should send HTML content', () => {
      const { ctx, res } = createMockContext()
      ctx.html('<h1>Hello</h1>')
      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.contentType).toHaveBeenCalledWith('text/html')
      expect(res.send).toHaveBeenCalledWith('<h1>Hello</h1>')
    })

    it('download() should send buffer with headers', () => {
      const { ctx, res } = createMockContext()
      const buffer = Buffer.from('data')
      ctx.download(buffer, 'file.pdf', 'application/pdf')
      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.contentType).toHaveBeenCalledWith('application/pdf')
      expect(res.send).toHaveBeenCalledWith(buffer)
    })
  })
})
