import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Container } from '@/core'
import { DeleteUserUseCase } from './delete-user.use-case'
import { USER_REPOSITORY, type IUserRepository } from '../../domain/repositories/user.repository'
import { User } from '../../domain/entities/user.entity'

describe('DeleteUserUseCase', () => {
  let useCase: DeleteUserUseCase
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
    container.register(DeleteUserUseCase, DeleteUserUseCase)
    useCase = container.resolve(DeleteUserUseCase)
  })

  it('should delete an existing user', async () => {
    const user = User.create({ name: 'Alice', email: 'alice@example.com' })
    ;(mockRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(user)

    await useCase.execute(user.id.toString())

    expect(mockRepo.delete).toHaveBeenCalledOnce()
  })

  it('should throw when user is not found', async () => {
    await expect(useCase.execute('non-existent')).rejects.toThrow('User not found: non-existent')
    expect(mockRepo.delete).not.toHaveBeenCalled()
  })
})
