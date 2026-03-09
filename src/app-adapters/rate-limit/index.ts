import { RateLimiterAdapter } from '@/core'

export const rateLimitAdapter = new RateLimiterAdapter({
  rules: [
    {
      name: 'auth',
      paths: ['/api/v1/auth/login', '/api/v1/auth/register'],
      max: 10,
      windowMs: 15 * 60 * 1000,
      message: { error: 'Too many auth attempts, try again in 15 minutes' },
    },
    {
      name: 'global',
      max: 200,
      windowMs: 15 * 60 * 1000,
    },
  ],
})
