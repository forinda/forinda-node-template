import { Container, buildRoutes, type AppModule, type ModuleRoutes } from '@/core'
import { PRODUCT_REPOSITORY } from './domain/repositories/product.repository'
import { InMemoryProductRepository } from './infrastructure/repositories/in-memory-product.repository'
import { ProductController } from './presentation/product.controller'

import.meta.glob(
  [
    './domain/services/**/*.ts',
    './application/use-cases/**/*.ts',
    './presentation/**/*.controller.ts',
  ],
  { eager: true },
)

export class ProductModule implements AppModule {
  register(container: Container): void {
    const repo = container.resolve(InMemoryProductRepository)
    container.registerInstance(PRODUCT_REPOSITORY, repo)
  }

  routes(): ModuleRoutes {
    return { path: '/products', router: buildRoutes(ProductController), controller: ProductController }
  }
}
