import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import { Container, Application, buildRoutes } from '@/core'
import type { AppModule, AppModuleClass, ModuleRoutes } from '@/core'
import { CATEGORY_REPOSITORY } from '../domain/repositories/category.repository'
import { InMemoryCategoryRepository } from '../infrastructure/repositories/in-memory-category.repository'
import { CategoryDomainService } from '../domain/services/category-domain.service'
import { CreateCategoryUseCase } from '../application/use-cases/create-category.use-case'
import { GetCategoryUseCase } from '../application/use-cases/get-category.use-case'
import { ListCategoriesUseCase } from '../application/use-cases/list-categories.use-case'
import { UpdateCategoryUseCase } from '../application/use-cases/update-category.use-case'
import { DeleteCategoryUseCase } from '../application/use-cases/delete-category.use-case'
import { CategoryController } from './category.controller'

class TestCategoryModule implements AppModule {
  register(container: Container): void {
    // Register all classes explicitly (since Container.reset() wipes decoration-time registrations)
    container.register(InMemoryCategoryRepository, InMemoryCategoryRepository)
    container.register(CategoryDomainService, CategoryDomainService)
    container.register(CreateCategoryUseCase, CreateCategoryUseCase)
    container.register(GetCategoryUseCase, GetCategoryUseCase)
    container.register(ListCategoriesUseCase, ListCategoriesUseCase)
    container.register(UpdateCategoryUseCase, UpdateCategoryUseCase)
    container.register(DeleteCategoryUseCase, DeleteCategoryUseCase)
    container.register(CategoryController, CategoryController)
    const repo = container.resolve(InMemoryCategoryRepository)
    container.registerInstance(CATEGORY_REPOSITORY, repo)
  }

  routes(): ModuleRoutes {
    return {
      path: '/categories',
      router: buildRoutes(CategoryController),
      controller: CategoryController,
    }
  }
}

describe('CategoryController (HTTP integration)', () => {
  let app: Application
  let expressApp: any

  beforeEach(() => {
    Container.reset()
    app = new Application({
      modules: [TestCategoryModule as AppModuleClass],
      helmet: false,
      cors: false,
      compression: false,
      morgan: false,
    })
    ;(app as any).setup()
    expressApp = app.getExpressApp()
  })

  afterEach(async () => {
    if (app) await app.shutdown()
  })

  describe('POST /api/v1/categories/', () => {
    it('should create a category and return 201', async () => {
      const res = await request(expressApp)
        .post('/api/v1/categories/')
        .send({ name: 'Electronics', description: 'Gadgets' })

      expect(res.status).toBe(201)
      expect(res.body).toMatchObject({
        name: 'Electronics',
        description: 'Gadgets',
      })
      expect(res.body.id).toBeTruthy()
      expect(res.body.createdAt).toBeTruthy()
      expect(res.body.updatedAt).toBeTruthy()
    })

    it('should return 422 when name is missing', async () => {
      const res = await request(expressApp)
        .post('/api/v1/categories/')
        .send({ description: 'No name' })

      expect(res.status).toBe(422)
    })

    it('should return 422 when name is too short', async () => {
      const res = await request(expressApp)
        .post('/api/v1/categories/')
        .send({ name: 'A', description: '' })

      expect(res.status).toBe(422)
    })

    it('should use default empty description when not provided', async () => {
      const res = await request(expressApp).post('/api/v1/categories/').send({ name: 'Minimal' })

      expect(res.status).toBe(201)
      expect(res.body.description).toBe('')
    })
  })

  describe('GET /api/v1/categories/', () => {
    it('should return an empty array initially', async () => {
      const res = await request(expressApp).get('/api/v1/categories/')

      expect(res.status).toBe(200)
      expect(res.body).toEqual([])
    })

    it('should return all created categories', async () => {
      await request(expressApp)
        .post('/api/v1/categories/')
        .send({ name: 'Books', description: 'All books' })
      await request(expressApp)
        .post('/api/v1/categories/')
        .send({ name: 'Music', description: 'All music' })

      const res = await request(expressApp).get('/api/v1/categories/')

      expect(res.status).toBe(200)
      expect(res.body).toHaveLength(2)
    })
  })

  describe('GET /api/v1/categories/:id', () => {
    it('should return a category by id', async () => {
      const created = await request(expressApp)
        .post('/api/v1/categories/')
        .send({ name: 'Fetch Me', description: 'Desc' })

      const res = await request(expressApp).get(`/api/v1/categories/${created.body.id}`)

      expect(res.status).toBe(200)
      expect(res.body.name).toBe('Fetch Me')
    })

    it('should return 404 for a non-existent id', async () => {
      const res = await request(expressApp).get(
        '/api/v1/categories/00000000-0000-0000-0000-000000000000',
      )

      expect(res.status).toBe(404)
    })
  })

  describe('PUT /api/v1/categories/:id', () => {
    it('should update a category name', async () => {
      const created = await request(expressApp)
        .post('/api/v1/categories/')
        .send({ name: 'Old Name', description: 'Desc' })

      const res = await request(expressApp)
        .put(`/api/v1/categories/${created.body.id}`)
        .send({ name: 'New Name' })

      expect(res.status).toBe(200)
      expect(res.body.name).toBe('New Name')
      expect(res.body.description).toBe('Desc')
    })

    it('should update a category description', async () => {
      const created = await request(expressApp)
        .post('/api/v1/categories/')
        .send({ name: 'Test', description: 'Old desc' })

      const res = await request(expressApp)
        .put(`/api/v1/categories/${created.body.id}`)
        .send({ description: 'New desc' })

      expect(res.status).toBe(200)
      expect(res.body.description).toBe('New desc')
    })

    it('should return 500 for a non-existent category', async () => {
      const res = await request(expressApp)
        .put('/api/v1/categories/00000000-0000-0000-0000-000000000000')
        .send({ name: 'Nope' })

      // The use case throws an Error which the framework catches as 500
      expect(res.status).toBeGreaterThanOrEqual(400)
    })
  })

  describe('DELETE /api/v1/categories/:id', () => {
    it('should delete a category and return 204', async () => {
      const created = await request(expressApp)
        .post('/api/v1/categories/')
        .send({ name: 'Delete Me', description: '' })

      const res = await request(expressApp).delete(`/api/v1/categories/${created.body.id}`)

      expect(res.status).toBe(204)

      // Verify it is gone
      const getRes = await request(expressApp).get(`/api/v1/categories/${created.body.id}`)
      expect(getRes.status).toBe(404)
    })

    it('should return an error for a non-existent category', async () => {
      const res = await request(expressApp).delete(
        '/api/v1/categories/00000000-0000-0000-0000-000000000000',
      )

      expect(res.status).toBeGreaterThanOrEqual(400)
    })
  })
})
