import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Container } from '@/core'
import { UpdateUserUseCase } from './update-user.use-case'
import { USER_REPOSITORY, type IUserRepository } from '../../domain/repositories/user.repository'
import { User } from '../../domain/entities/user.entity'

describe('UpdateUserUseCase', () => {
  let useCase: UpdateUserUseCase
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
    container.register(UpdateUserUseCase, UpdateUserUseCase)
    useCase = container.resolve(UpdateUserUseCase)
  })

  it('should update the user name', async () => {
    const user = User.create({ name: 'Alice', email: 'alice@example.com' })
    ;(mockRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(user)

    const result = await useCase.execute(user.id.toString(), { name: 'Alice Updated' })

    expect(result.name).toBe('Alice Updated')
    expect(result.email).toBe('alice@example.com')
    expect(mockRepo.save).toHaveBeenCalledOnce()
  })

  it('should update the user email', async () => {
    const user = User.create({ name: 'Alice', email: 'alice@example.com' })
    ;(mockRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(user)

    const result = await useCase.execute(user.id.toString(), { email: 'newalice@example.com' })

    expect(result.email).toBe('newalice@example.com')
    expect(result.name).toBe('Alice')
  })

  it('should update both name and email', async () => {
    const user = User.create({ name: 'Alice', email: 'alice@example.com' })
    ;(mockRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(user)

    const result = await useCase.execute(user.id.toString(), {
      name: 'Bob',
      email: 'bob@example.com',
    })

    expect(result.name).toBe('Bob')
    expect(result.email).toBe('bob@example.com')
  })

  it('should throw when user is not found', async () => {
    await expect(useCase.execute('non-existent', { name: 'Nope' })).rejects.toThrow(
      'User not found: non-existent',
    )
  })
})
