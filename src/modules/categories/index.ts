import { Container, buildRoutes, type AppModule, type ModuleRoutes } from '@/core'
import { CATEGORY_REPOSITORY } from './domain/repositories/category.repository'
import { InMemoryCategoryRepository } from './infrastructure/repositories/in-memory-category.repository'
import { CategoryController } from './presentation/category.controller'

import.meta.glob(
  [
    './domain/services/**/*.ts',
    './application/use-cases/**/*.ts',
    './presentation/**/*.controller.ts',
  ],
  { eager: true },
)

export class CategoryModule implements AppModule {
  register(container: Container): void {
    const repo = container.resolve(InMemoryCategoryRepository)
    container.registerInstance(CATEGORY_REPOSITORY, repo)
  }

  routes(): ModuleRoutes {
    return { path: '/categories', router: buildRoutes(CategoryController), controller: CategoryController }
  }
}
