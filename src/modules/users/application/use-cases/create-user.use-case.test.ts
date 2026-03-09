import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Container } from '@/core'
import { CreateUserUseCase } from './create-user.use-case'
import { UserDomainService } from '../../domain/services/user-domain.service'
import { USER_REPOSITORY, type IUserRepository } from '../../domain/repositories/user.repository'

describe('CreateUserUseCase', () => {
  let useCase: CreateUserUseCase
  let mockRepo: IUserRepository

  beforeEach(() => {
    Container.reset()

    mockRepo = {
      findById: vi.fn().mockResolvedValue(null),
      findByEmail: vi.fn().mockResolvedValue(null),
      findAll: vi.fn().mockResolvedValue([]),
      save: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    }

    const container = Container.getInstance()
    container.registerInstance(USER_REPOSITORY, mockRepo)
    container.register(UserDomainService, UserDomainService)
    container.register(CreateUserUseCase, CreateUserUseCase)
    useCase = container.resolve(CreateUserUseCase)
  })

  it('should create a user and return a response DTO', async () => {
    const result = await useCase.execute({ name: 'Alice', email: 'alice@example.com' })

    expect(result).toMatchObject({
      name: 'Alice',
      email: 'alice@example.com',
    })
    expect(result.id).toBeTruthy()
    expect(result.createdAt).toBeTruthy()
    expect(result.updatedAt).toBeTruthy()
  })

  it('should throw when email is already in use', async () => {
    const { User } = await import('../../domain/entities/user.entity')
    const existing = User.create({ name: 'Existing', email: 'alice@example.com' })
    ;(mockRepo.findByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(existing)

    await expect(useCase.execute({ name: 'Alice', email: 'alice@example.com' })).rejects.toThrow(
      'Email already in use',
    )
  })
})
