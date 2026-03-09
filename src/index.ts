import 'reflect-metadata'
import { Application, SwaggerAdapter } from '@/core'
import { modules } from '@/modules'
import { redisAdapter } from './redis'
import { socketAdapter } from './socket'

// Store the app on globalThis so we can shut it down on HMR before restarting
const g = globalThis as any

async function main() {
  // Shut down previous instance if it exists (HMR reload)
  if (g.__app) {
    await g.__app.shutdown()
  }

  const app = new Application({
    modules,
    adapters: [
      socketAdapter,
      redisAdapter,
      new SwaggerAdapter({
        info: { title: 'Node App API', version: '1.0.0' },
      }),
    ],
  })

  g.__app = app
  app.start()
}

main()
