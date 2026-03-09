import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Container } from '@/core'
import { GetUserUseCase } from './get-user.use-case'
import { USER_REPOSITORY, type IUserRepository } from '../../domain/repositories/user.repository'
import { User } from '../../domain/entities/user.entity'

describe('GetUserUseCase', () => {
  let useCase: GetUserUseCase
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
    container.register(GetUserUseCase, GetUserUseCase)
    useCase = container.resolve(GetUserUseCase)
  })

  it('should return a user response when found', async () => {
    const user = User.create({ name: 'Alice', email: 'alice@example.com' })
    ;(mockRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(user)

    const result = await useCase.execute(user.id.toString())

    expect(result).not.toBeNull()
    expect(result!.name).toBe('Alice')
    expect(result!.email).toBe('alice@example.com')
  })

  it('should return null when user is not found', async () => {
    const result = await useCase.execute('non-existent-id')
    expect(result).toBeNull()
  })
})
