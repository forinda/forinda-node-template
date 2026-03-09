import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import type { StringValue } from 'ms'
import { Service } from '@/core'
import { getEnv } from '@/core/env'

@Service()
export class AuthService {
  private readonly SALT_ROUNDS = 12

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS)
  }

  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash)
  }

  generateToken(payload: { sub: string; email: string }): string {
    const secret = getEnv('JWT_SECRET')
    const expiresIn = getEnv('JWT_EXPIRATION')
    return jwt.sign(payload, secret, { expiresIn: expiresIn as StringValue })
  }

  verifyToken(token: string): { sub: string; email: string } {
    const secret = getEnv('JWT_SECRET')
    return jwt.verify(token, secret) as { sub: string; email: string }
  }
}
