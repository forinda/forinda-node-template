import { Container, type RequestContext } from '@/core'
import { AuthService } from '../../domain/services/auth.service'

export const AUTH_USER_KEY = 'authUser'

export interface AuthUser {
  sub: string
  email: string
}

/**
 * Framework middleware that verifies the JWT from the Authorization header
 * and attaches the decoded payload to the RequestContext metadata.
 */
export async function authGuard(ctx: RequestContext, next: () => void): Promise<void> {
  const header = ctx.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    ctx.res.status(401).json({ message: 'Missing or invalid authorization header' })
    return
  }

  const token = header.slice(7)

  try {
    const container = Container.getInstance()
    const authService = container.resolve(AuthService)
    const payload = authService.verifyToken(token)
    ctx.set(AUTH_USER_KEY, payload)
    next()
  } catch {
    ctx.res.status(401).json({ message: 'Invalid or expired token' })
  }
}
