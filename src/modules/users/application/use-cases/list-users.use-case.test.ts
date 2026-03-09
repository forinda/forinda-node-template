import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Container } from '@/core'
import { ListUsersUseCase } from './list-users.use-case'
import { USER_REPOSITORY, type IUserRepository } from '../../domain/repositories/user.repository'
import { User } from '../../domain/entities/user.entity'

describe('ListUsersUseCase', () => {
  let useCase: ListUsersUseCase
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
    container.register(ListUsersUseCase, ListUsersUseCase)
    useCase = container.resolve(ListUsersUseCase)
  })

  it('should return an empty array when no users exist', async () => {
    const result = await useCase.execute()
    expect(result).toEqual([])
  })

  it('should return all users as response DTOs', async () => {
    const user1 = User.create({ name: 'Alice', email: 'alice@example.com' })
    const user2 = User.create({ name: 'Bob', email: 'bob@example.com' })
    ;(mockRepo.findAll as ReturnType<typeof vi.fn>).mockResolvedValue([user1, user2])

    const result = await useCase.execute()

    expect(result).toHaveLength(2)
    expect(result[0].name).toBe('Alice')
    expect(result[1].name).toBe('Bob')
  })
})
