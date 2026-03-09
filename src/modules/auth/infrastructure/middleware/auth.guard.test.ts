import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import express from 'express'
import request from 'supertest'
import { Container } from '@/core'
import { AuthService } from '../../domain/services/auth.service'
import { authGuard, AUTH_USER_KEY } from './auth.guard'
import { RequestContext } from '@/core/context'

describe('authGuard', () => {
  let app: express.Express
  let authService: AuthService

  beforeEach(() => {
    Container.reset()
    const container = Container.getInstance()
    container.register(AuthService, AuthService)
    authService = container.resolve(AuthService)

    // Create a minimal Express app that uses the guard via RequestContext
    app = express()
    app.get('/protected', (req, res, next) => {
      const ctx = new RequestContext(req, res, next)
      authGuard(ctx, () => {
        // Guard passed — return the decoded auth user
        const authUser = ctx.get(AUTH_USER_KEY)
        res.status(200).json(authUser)
      })
    })
  })

  afterEach(() => {
    Container.reset()
  })

  it('should pass with a valid Bearer token and attach auth user', async () => {
    const token = authService.generateToken({ sub: 'user-1', email: 'test@test.com' })

    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.sub).toBe('user-1')
    expect(res.body.email).toBe('test@test.com')
  })

  it('should return 401 without Authorization header', async () => {
    const res = await request(app).get('/protected')

    expect(res.status).toBe(401)
    expect(res.body.message).toBe('Missing or invalid authorization header')
  })

  it('should return 401 with a non-Bearer authorization header', async () => {
    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Basic abc123')

    expect(res.status).toBe(401)
    expect(res.body.message).toBe('Missing or invalid authorization header')
  })

  it('should return 401 with an invalid/expired token', async () => {
    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer invalid.token.here')

    expect(res.status).toBe(401)
    expect(res.body.message).toBe('Invalid or expired token')
  })
})
