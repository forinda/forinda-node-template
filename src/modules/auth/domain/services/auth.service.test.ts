import { describe, it, expect } from 'vitest'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { AuthService } from './auth.service'

describe('AuthService', () => {
  // Construct directly — bypasses DI since we only test pure logic
  const service = new (AuthService as any)() as AuthService

  describe('hashPassword', () => {
    it('should return a bcrypt hash', async () => {
      const hash = await service.hashPassword('myPassword123')

      expect(hash).toBeTruthy()
      expect(hash).not.toBe('myPassword123')
      // bcrypt hashes start with $2a$ or $2b$
      expect(hash).toMatch(/^\$2[aby]\$/)
    })
  })

  describe('comparePassword', () => {
    it('should return true for correct password', async () => {
      const hash = await bcrypt.hash('secret', 10)
      const result = await service.comparePassword('secret', hash)

      expect(result).toBe(true)
    })

    it('should return false for wrong password', async () => {
      const hash = await bcrypt.hash('secret', 10)
      const result = await service.comparePassword('wrong', hash)

      expect(result).toBe(false)
    })
  })

  describe('generateToken', () => {
    it('should return a JWT string', () => {
      const token = service.generateToken({ sub: 'user-1', email: 'a@b.com' })

      expect(typeof token).toBe('string')
      // JWTs have 3 dot-separated parts
      expect(token.split('.')).toHaveLength(3)
    })

    it('should embed sub and email in the payload', () => {
      const token = service.generateToken({ sub: 'user-42', email: 'test@example.com' })
      const decoded = jwt.decode(token) as any

      expect(decoded.sub).toBe('user-42')
      expect(decoded.email).toBe('test@example.com')
    })
  })

  describe('verifyToken', () => {
    it('should decode a valid token correctly', () => {
      const token = service.generateToken({ sub: 'user-1', email: 'a@b.com' })
      const payload = service.verifyToken(token)

      expect(payload.sub).toBe('user-1')
      expect(payload.email).toBe('a@b.com')
    })

    it('should throw for an invalid token', () => {
      expect(() => service.verifyToken('not.a.valid.token')).toThrow()
    })

    it('should throw for a token signed with a different secret', () => {
      const badToken = jwt.sign({ sub: 'x', email: 'x@y.com' }, 'wrong-secret')

      expect(() => service.verifyToken(badToken)).toThrow()
    })
  })
})
