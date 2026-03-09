import { Container, buildRoutes, type AppModule, type ModuleRoutes } from '@/core'
import { AUTH_REPOSITORY } from './domain/repositories/auth.repository'
import { DrizzleAuthRepository } from './infrastructure/repositories/drizzle-auth.repository'
import { AuthController } from './presentation/auth.controller'

import.meta.glob(['./domain/services/**/*.ts', './application/use-cases/**/*.ts'], { eager: true })

export class AuthModule implements AppModule {
  register(container: Container): void {
    container.registerFactory(AUTH_REPOSITORY, () => container.resolve(DrizzleAuthRepository))
  }

  routes(): ModuleRoutes {
    return { path: '/auth', router: buildRoutes(AuthController), controller: AuthController }
  }
}
