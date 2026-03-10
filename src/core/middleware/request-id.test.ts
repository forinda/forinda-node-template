import { describe, it, expect } from 'vitest'
import express from 'express'
import request from 'supertest'
import { requestId, REQUEST_ID_HEADER } from './request-id'

function createApp() {
  const app = express()
  app.use(requestId())
  app.get('/test', (req, res) => {
    res.json({ requestId: (req as any).id })
  })
  return app
}

describe('requestId middleware', () => {
  it('should generate a UUID when no header is provided', async () => {
    const app = createApp()
    const res = await request(app).get('/test')

    expect(res.status).toBe(200)
    expect(res.headers[REQUEST_ID_HEADER]).toBeDefined()
    expect(res.body.requestId).toBe(res.headers[REQUEST_ID_HEADER])
    // UUID v4 format
    expect(res.body.requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    )
  })

  it('should reuse the incoming X-Request-Id header', async () => {
    const app = createApp()
    const customId = 'my-trace-id-123'
    const res = await request(app).get('/test').set(REQUEST_ID_HEADER, customId)

    expect(res.status).toBe(200)
    expect(res.headers[REQUEST_ID_HEADER]).toBe(customId)
    expect(res.body.requestId).toBe(customId)
  })

  it('should set unique IDs for different requests', async () => {
    const app = createApp()
    const res1 = await request(app).get('/test')
    const res2 = await request(app).get('/test')

    expect(res1.headers[REQUEST_ID_HEADER]).not.toBe(res2.headers[REQUEST_ID_HEADER])
  })
})
