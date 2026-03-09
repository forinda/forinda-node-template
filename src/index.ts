import 'reflect-metadata'
import { Application, SwaggerAdapter, DatabaseAdapter, loadEnv, type AppAdapter } from '@/core'
import { modules } from '@/modules'
import { redisAdapter } from './redis'
import { socketAdapter } from './socket'
import * as schema from '@/db/schema'

// Store the app on globalThis so we can shut it down on HMR before restarting
const g = globalThis as any

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
