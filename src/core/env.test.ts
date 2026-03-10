import { describe, it, expect, afterEach } from 'vitest'
import { envSchema } from './env'
import { ConfigService } from './config.service'

describe('envSchema', () => {
  it('should validate correct environment variables', () => {
    const result = envSchema.safeParse({
      DATABASE_URL: 'postgres://localhost/db',
      PORT: '4000',
      NODE_ENV: 'production',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.PORT).toBe(4000)
      expect(result.data.NODE_ENV).toBe('production')
    }
  })

  it('should apply defaults for optional fields', () => {
    const result = envSchema.safeParse({
      DATABASE_URL: 'postgres://localhost/db',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.PORT).toBe(8000)
      expect(result.data.NODE_ENV).toBe('development')
      expect(result.data.REDIS_HOST).toBe('127.0.0.1')
      expect(result.data.REDIS_PORT).toBe(6379)
      expect(result.data.JWT_SECRET).toBe('change-me-in-production')
      expect(result.data.JWT_EXPIRATION).toBe('7d')
      expect(result.data.MAIL_FROM).toBe('noreply@example.com')
    }
  })

  it('should fail when DATABASE_URL is missing', () => {
    const result = envSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('should reject invalid NODE_ENV', () => {
    const result = envSchema.safeParse({
      DATABASE_URL: 'postgres://localhost/db',
      NODE_ENV: 'staging',
    })
    expect(result.success).toBe(false)
  })

  it('should transform REDIS_ENABLE_SUBSCRIBER to boolean', () => {
    const result = envSchema.safeParse({
      DATABASE_URL: 'postgres://localhost/db',
      REDIS_ENABLE_SUBSCRIBER: 'false',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.REDIS_ENABLE_SUBSCRIBER).toBe(false)
    }
  })

  it('should coerce PORT to number', () => {
    const result = envSchema.safeParse({
      DATABASE_URL: 'postgres://localhost/db',
      PORT: '8080',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.PORT).toBe(8080)
      expect(typeof result.data.PORT).toBe('number')
    }
  })
})

describe('ConfigService', () => {
  it('should provide typed access to env vars', () => {
    const config = new ConfigService()
    expect(config.get('DATABASE_URL')).toBe('postgres://test:test@localhost:5432/testdb')
    expect(config.isTest()).toBe(true)
    expect(config.isProduction()).toBe(false)
    expect(config.isDevelopment()).toBe(false)
  })

  it('should return all env values via getAll()', () => {
    const config = new ConfigService()
    const all = config.getAll()
    expect(all.DATABASE_URL).toBeDefined()
    expect(all.PORT).toBeDefined()
  })
})
