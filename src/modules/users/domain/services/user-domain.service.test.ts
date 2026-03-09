import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Container } from '@/core'
import { UserDomainService } from './user-domain.service'
import { USER_REPOSITORY, type IUserRepository } from '../repositories/user.repository'
import { User } from '../entities/user.entity'
import { Email } from '../value-objects/email.vo'

describe('UserDomainService', () => {
  let service: UserDomainService
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
    service = container.resolve(UserDomainService)
  })

  describe('createUser', () => {
    it('should create and save a user when email is unique', async () => {
      const user = await service.createUser('Alice', 'alice@example.com')

      expect(user.name).toBe('Alice')
      expect(user.email.toString()).toBe('alice@example.com')
      expect(mockRepo.save).toHaveBeenCalledOnce()
      expect(mockRepo.findByEmail).toHaveBeenCalledOnce()
    })

    it('should throw when email is already in use', async () => {
      const existing = User.create({ name: 'Existing', email: 'alice@example.com' })
      ;(mockRepo.findByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(existing)

      await expect(service.createUser('Alice', 'alice@example.com')).rejects.toThrow(
        'Email already in use: alice@example.com',
      )
      expect(mockRepo.save).not.toHaveBeenCalled()
    })
  })

  describe('ensureEmailUnique', () => {
    it('should not throw when email is unique', async () => {
      await expect(service.ensureEmailUnique('unique@example.com')).resolves.toBeUndefined()
    })

    it('should throw when email already exists', async () => {
      const existing = User.create({ name: 'Existing', email: 'taken@example.com' })
      ;(mockRepo.findByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(existing)

      await expect(service.ensureEmailUnique('taken@example.com')).rejects.toThrow(
        'Email already in use',
      )
    })
  })
})
