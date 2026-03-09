import 'reflect-metadata'
import { Application, SwaggerAdapter, DatabaseAdapter, loadEnv, type AppAdapter } from '@/core'
import { createLogger } from '@/core/logger'
import { modules } from '@/modules'
import { redisAdapter } from './redis'
import { socketAdapter } from './socket'
import * as schema from '@/db/schema'

const log = createLogger('Process')

// Store the app on globalThis so we can shut it down on HMR before restarting
const g = globalThis as any

// ── Global error handlers ─────────────────────────────────────────────
// Keep the process alive on unexpected errors instead of crashing

process.on('uncaughtException', (err) => {
  log.error(err, 'Uncaught exception')
})

process.on('unhandledRejection', (reason) => {
  log.error(reason, 'Unhandled rejection')
})

// Graceful shutdown on SIGINT / SIGTERM
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, async () => {
    log.info(`Received ${signal}, shutting down gracefully...`)
    if (g.__app) {
      await g.__app.shutdown()
    }
    process.exit(0)
  })
}

async function main() {
  // Shut down previous instance if it exists (HMR reload)
  if (g.__app) {
    await g.__app.shutdown()
  }

  const env = loadEnv()

  const adapters: AppAdapter[] = [
    socketAdapter,
    redisAdapter,
    new SwaggerAdapter({
      info: { title: 'Node App API', version: '1.0.0' },
    }),
    new DatabaseAdapter({ url: env.DATABASE_URL, schema }),
  ]

  const app = new Application({
    modules,
    adapters,
  })

  g.__app = app
  app.start()
}

main()
