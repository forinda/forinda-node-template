import { Container, buildRoutes, type AppModule, type ModuleRoutes } from '@/core'
import { USER_REPOSITORY } from './domain/repositories/user.repository'
import { InMemoryUserRepository } from './infrastructure/repositories/in-memory-user.repository'
import { UserController } from './presentation/user.controller'

import.meta.glob(
  ['./domain/services/**/*.ts', './application/use-cases/**/*.ts', '!./**/*.test.ts'],
  { eager: true },
)

export class UserModule implements AppModule {
  register(container: Container): void {
    const repo = container.resolve(InMemoryUserRepository)
    container.registerInstance(USER_REPOSITORY, repo)
  }

  routes(): ModuleRoutes {
    return { path: '/users', router: buildRoutes(UserController), controller: UserController }
  }
}
