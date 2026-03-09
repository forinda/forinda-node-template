/**
 * @module adapters
 * Re-exports all adapter types and implementations for plugging external
 * services (Socket.IO, Redis, etc.) into the application lifecycle.
 */
export { type AppAdapter, type AppAdapterClass } from './adapter'
export {
  SocketAdapter,
  SOCKET_IO,
  type SocketAdapterOptions,
  type SocketEventHandler,
} from './socket.adapter'
export { RedisAdapter, REDIS, REDIS_SUBSCRIBER, type RedisAdapterOptions } from './redis.adapter'
export { SwaggerAdapter, type SwaggerAdapterOptions } from './swagger.adapter'
