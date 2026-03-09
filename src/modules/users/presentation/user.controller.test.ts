import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import { Container, Application, buildRoutes } from '@/core'
import type { AppModule, AppModuleClass, ModuleRoutes } from '@/core'
import { USER_REPOSITORY } from '../domain/repositories/user.repository'
import { InMemoryUserRepository } from '../infrastructure/repositories/in-memory-user.repository'
import { UserDomainService } from '../domain/services/user-domain.service'
import { CreateUserUseCase } from '../application/use-cases/create-user.use-case'
import { GetUserUseCase } from '../application/use-cases/get-user.use-case'
import { ListUsersUseCase } from '../application/use-cases/list-users.use-case'
import { UpdateUserUseCase } from '../application/use-cases/update-user.use-case'
import { DeleteUserUseCase } from '../application/use-cases/delete-user.use-case'
import { UserController } from './user.controller'

class TestUserModule implements AppModule {
  register(container: Container): void {
    container.register(InMemoryUserRepository, InMemoryUserRepository)
    container.register(UserDomainService, UserDomainService)
    container.register(CreateUserUseCase, CreateUserUseCase)
    container.register(GetUserUseCase, GetUserUseCase)
    container.register(ListUsersUseCase, ListUsersUseCase)
    container.register(UpdateUserUseCase, UpdateUserUseCase)
    container.register(DeleteUserUseCase, DeleteUserUseCase)
    container.register(UserController, UserController)
    const repo = container.resolve(InMemoryUserRepository)
    container.registerInstance(USER_REPOSITORY, repo)
  }

  routes(): ModuleRoutes {
    return {
      path: '/users',
      router: buildRoutes(UserController),
      controller: UserController,
    }
  }
}

describe('UserController (HTTP integration)', () => {
  let app: Application
  let expressApp: any

  beforeEach(() => {
    Container.reset()

    app = new Application({
      modules: [TestUserModule as AppModuleClass],
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

  describe('POST /api/v1/users/', () => {
    it('should create a user and return 201', async () => {
      const res = await request(expressApp)
        .post('/api/v1/users/')
        .send({ name: 'Alice', email: 'alice@example.com' })

      expect(res.status).toBe(201)
      expect(res.body.name).toBe('Alice')
      expect(res.body.email).toBe('alice@example.com')
      expect(res.body.id).toBeTruthy()
    })

    it('should return 422 for missing name', async () => {
      const res = await request(expressApp)
        .post('/api/v1/users/')
        .send({ email: 'alice@example.com' })

      expect(res.status).toBe(422)
    })

    it('should return 422 for invalid email', async () => {
      const res = await request(expressApp)
        .post('/api/v1/users/')
        .send({ name: 'Alice', email: 'not-an-email' })

      expect(res.status).toBe(422)
    })

    it('should return 422 for empty body', async () => {
      const res = await request(expressApp).post('/api/v1/users/').send({})

      expect(res.status).toBe(422)
    })
  })

  describe('GET /api/v1/users/', () => {
    it('should return an empty array when no users exist', async () => {
      const res = await request(expressApp).get('/api/v1/users/')

      expect(res.status).toBe(200)
      expect(res.body).toEqual([])
    })

    it('should return all created users', async () => {
      await request(expressApp)
        .post('/api/v1/users/')
        .send({ name: 'Alice', email: 'alice@example.com' })
      await request(expressApp)
        .post('/api/v1/users/')
        .send({ name: 'Bob', email: 'bob@example.com' })

      const res = await request(expressApp).get('/api/v1/users/')

      expect(res.status).toBe(200)
      expect(res.body).toHaveLength(2)
    })
  })

  describe('GET /api/v1/users/:id', () => {
    it('should return a user by id', async () => {
      const created = await request(expressApp)
        .post('/api/v1/users/')
        .send({ name: 'Alice', email: 'alice@example.com' })

      const res = await request(expressApp).get(`/api/v1/users/${created.body.id}`)

      expect(res.status).toBe(200)
      expect(res.body.name).toBe('Alice')
    })

    it('should return 404 for non-existent user', async () => {
      const res = await request(expressApp).get('/api/v1/users/non-existent-id')

      expect(res.status).toBe(404)
    })
  })

  describe('PUT /api/v1/users/:id', () => {
    it('should update a user name', async () => {
      const created = await request(expressApp)
        .post('/api/v1/users/')
        .send({ name: 'Alice', email: 'alice@example.com' })

      const res = await request(expressApp)
        .put(`/api/v1/users/${created.body.id}`)
        .send({ name: 'Alice Updated' })

      expect(res.status).toBe(200)
      expect(res.body.name).toBe('Alice Updated')
      expect(res.body.email).toBe('alice@example.com')
    })

    it('should update a user email', async () => {
      const created = await request(expressApp)
        .post('/api/v1/users/')
        .send({ name: 'Alice', email: 'alice@example.com' })

      const res = await request(expressApp)
        .put(`/api/v1/users/${created.body.id}`)
        .send({ email: 'newalice@example.com' })

      expect(res.status).toBe(200)
      expect(res.body.email).toBe('newalice@example.com')
    })
  })

  describe('DELETE /api/v1/users/:id', () => {
    it('should delete a user and return 204', async () => {
      const created = await request(expressApp)
        .post('/api/v1/users/')
        .send({ name: 'Alice', email: 'alice@example.com' })

      const res = await request(expressApp).delete(`/api/v1/users/${created.body.id}`)

      expect(res.status).toBe(204)

      // Verify it's gone
      const getRes = await request(expressApp).get(`/api/v1/users/${created.body.id}`)
      expect(getRes.status).toBe(404)
    })
  })
})
