import { getEnv, RedisAdapter } from '@/core'

export const redisAdapter = new RedisAdapter({
  connection: {
    host: getEnv('REDIS_HOST'),
    port: getEnv('REDIS_PORT'),
    password: getEnv('REDIS_PASSWORD'),
    db: getEnv('REDIS_DB'),
  },
  enableSubscriber: getEnv('REDIS_ENABLE_SUBSCRIBER'),
})
