import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import { Container, Application, buildRoutes } from '@/core'
import type { AppModule, AppModuleClass, ModuleRoutes } from '@/core'
import { PRODUCT_REPOSITORY } from '../domain/repositories/product.repository'
import { CATEGORY_REPOSITORY } from '@/modules/categories/domain/repositories/category.repository'
import { InMemoryProductRepository } from '../infrastructure/repositories/in-memory-product.repository'
import { InMemoryCategoryRepository } from '@/modules/categories/infrastructure/repositories/in-memory-category.repository'
import { ProductDomainService } from '../domain/services/product-domain.service'
import { CreateProductUseCase } from '../application/use-cases/create-product.use-case'
import { GetProductUseCase } from '../application/use-cases/get-product.use-case'
import { ListProductsUseCase } from '../application/use-cases/list-products.use-case'
import { UpdateProductUseCase } from '../application/use-cases/update-product.use-case'
import { DeleteProductUseCase } from '../application/use-cases/delete-product.use-case'
import { ProductController } from './product.controller'
import { Category } from '@/modules/categories/domain/entities/category.entity'

class TestProductModule implements AppModule {
  register(container: Container): void {
    // Register all classes explicitly (Container.reset() wipes decoration-time registrations)
    container.register(InMemoryProductRepository, InMemoryProductRepository)
    container.register(InMemoryCategoryRepository, InMemoryCategoryRepository)
    container.register(ProductDomainService, ProductDomainService)
    container.register(CreateProductUseCase, CreateProductUseCase)
    container.register(GetProductUseCase, GetProductUseCase)
    container.register(ListProductsUseCase, ListProductsUseCase)
    container.register(UpdateProductUseCase, UpdateProductUseCase)
    container.register(DeleteProductUseCase, DeleteProductUseCase)
    container.register(ProductController, ProductController)

    const productRepo = container.resolve(InMemoryProductRepository)
    container.registerInstance(PRODUCT_REPOSITORY, productRepo)

    const categoryRepo = container.resolve(InMemoryCategoryRepository)
    container.registerInstance(CATEGORY_REPOSITORY, categoryRepo)
  }

  routes(): ModuleRoutes {
    return {
      path: '/products',
      router: buildRoutes(ProductController),
      controller: ProductController,
    }
  }
}

describe('ProductController (HTTP integration)', () => {
  let app: Application
  let expressApp: any
  let testCategoryId: string

  beforeEach(async () => {
    Container.reset()
    app = new Application({
      modules: [TestProductModule as AppModuleClass],
      helmet: false,
      cors: false,
      compression: false,
      morgan: false,
    })
    ;(app as any).setup()
    expressApp = app.getExpressApp()

    // Seed a category so product creation can validate it
    const categoryRepo = Container.getInstance().resolve<InMemoryCategoryRepository>(
      CATEGORY_REPOSITORY as any,
    )
    const category = Category.create({ name: 'Test Category', description: 'For tests' })
    await categoryRepo.save(category)
    testCategoryId = category.id.toString()
  })

  afterEach(async () => {
    if (app) await app.shutdown()
  })

  const validProduct = () => ({
    name: 'Widget',
    description: 'A fine widget',
    price: 29.99,
    currency: 'USD',
    categoryId: testCategoryId,
    stock: 10,
  })

  describe('POST /api/v1/products/', () => {
    it('should create a product and return 201', async () => {
      const res = await request(expressApp)
        .post('/api/v1/products/')
        .send(validProduct())

      expect(res.status).toBe(201)
      expect(res.body).toMatchObject({
        name: 'Widget',
        description: 'A fine widget',
        price: { amount: 29.99, currency: 'USD' },
        stock: 10,
      })
      expect(res.body.id).toBeTruthy()
      expect(res.body.categoryId).toBe(testCategoryId)
    })

    it('should return 422 when name is missing', async () => {
      const { name: _, ...noName } = validProduct()
      const res = await request(expressApp).post('/api/v1/products/').send(noName)

      expect(res.status).toBe(422)
    })

    it('should return 422 when price is negative', async () => {
      const res = await request(expressApp)
        .post('/api/v1/products/')
        .send({ ...validProduct(), price: -5 })

      expect(res.status).toBe(422)
    })

    it('should return 422 when categoryId is not a valid UUID', async () => {
      const res = await request(expressApp)
        .post('/api/v1/products/')
        .send({ ...validProduct(), categoryId: 'not-a-uuid' })

      expect(res.status).toBe(422)
    })

    it('should return an error when category does not exist', async () => {
      const res = await request(expressApp)
        .post('/api/v1/products/')
        .send({ ...validProduct(), categoryId: '00000000-0000-0000-0000-000000000099' })

      expect(res.status).toBeGreaterThanOrEqual(400)
    })
  })

  describe('GET /api/v1/products/', () => {
    it('should return an empty array initially', async () => {
      const res = await request(expressApp).get('/api/v1/products/')

      expect(res.status).toBe(200)
      expect(res.body).toEqual([])
    })

    it('should return all created products', async () => {
      await request(expressApp).post('/api/v1/products/').send(validProduct())
      await request(expressApp)
        .post('/api/v1/products/')
        .send({ ...validProduct(), name: 'Gadget' })

      const res = await request(expressApp).get('/api/v1/products/')

      expect(res.status).toBe(200)
      expect(res.body).toHaveLength(2)
    })

    it('should filter products by categoryId query param', async () => {
      await request(expressApp).post('/api/v1/products/').send(validProduct())

      const res = await request(expressApp).get(
        `/api/v1/products/?categoryId=${testCategoryId}`,
      )

      expect(res.status).toBe(200)
      expect(res.body).toHaveLength(1)
      expect(res.body[0].categoryId).toBe(testCategoryId)
    })

    it('should return empty array when filtering by non-existent categoryId', async () => {
      await request(expressApp).post('/api/v1/products/').send(validProduct())

      const res = await request(expressApp).get(
        '/api/v1/products/?categoryId=00000000-0000-0000-0000-ffffffffffff',
      )

      expect(res.status).toBe(200)
      expect(res.body).toEqual([])
    })
  })

  describe('GET /api/v1/products/:id', () => {
    it('should return a product by id', async () => {
      const created = await request(expressApp)
        .post('/api/v1/products/')
        .send(validProduct())

      const res = await request(expressApp).get(`/api/v1/products/${created.body.id}`)

      expect(res.status).toBe(200)
      expect(res.body.name).toBe('Widget')
    })

    it('should return 404 for a non-existent id', async () => {
      const res = await request(expressApp).get(
        '/api/v1/products/00000000-0000-0000-0000-000000000000',
      )

      expect(res.status).toBe(404)
    })
  })

  describe('PUT /api/v1/products/:id', () => {
    it('should update a product name', async () => {
      const created = await request(expressApp)
        .post('/api/v1/products/')
        .send(validProduct())

      const res = await request(expressApp)
        .put(`/api/v1/products/${created.body.id}`)
        .send({ name: 'Updated Widget' })

      expect(res.status).toBe(200)
      expect(res.body.name).toBe('Updated Widget')
      expect(res.body.description).toBe('A fine widget')
    })

    it('should update a product price', async () => {
      const created = await request(expressApp)
        .post('/api/v1/products/')
        .send(validProduct())

      const res = await request(expressApp)
        .put(`/api/v1/products/${created.body.id}`)
        .send({ price: 49.99 })

      expect(res.status).toBe(200)
      expect(res.body.price.amount).toBe(49.99)
    })

    it('should update stock', async () => {
      const created = await request(expressApp)
        .post('/api/v1/products/')
        .send(validProduct())

      const res = await request(expressApp)
        .put(`/api/v1/products/${created.body.id}`)
        .send({ stock: 20 })

      expect(res.status).toBe(200)
      expect(res.body.stock).toBe(20)
    })

    it('should return an error for a non-existent product', async () => {
      const res = await request(expressApp)
        .put('/api/v1/products/00000000-0000-0000-0000-000000000000')
        .send({ name: 'Nope' })

      expect(res.status).toBeGreaterThanOrEqual(400)
    })
  })

  describe('DELETE /api/v1/products/:id', () => {
    it('should delete a product and return 204', async () => {
      const created = await request(expressApp)
        .post('/api/v1/products/')
        .send(validProduct())

      const res = await request(expressApp).delete(`/api/v1/products/${created.body.id}`)

      expect(res.status).toBe(204)

      // Verify it is gone
      const getRes = await request(expressApp).get(`/api/v1/products/${created.body.id}`)
      expect(getRes.status).toBe(404)
    })

    it('should return an error for a non-existent product', async () => {
      const res = await request(expressApp).delete(
        '/api/v1/products/00000000-0000-0000-0000-000000000000',
      )

      expect(res.status).toBeGreaterThanOrEqual(400)
    })
  })
})
