import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Container } from '@/core'
import {
  AUTH_REPOSITORY,
  type IAuthRepository,
  type UserRecord,
  type UserProfileRecord,
} from '../../domain/repositories/auth.repository'
import { GetMeUseCase } from './get-me.use-case'

function makeUser(overrides: Partial<UserRecord> = {}): UserRecord {
  return {
    id: 'user-1',
    email: 'test@example.com',
    password: '$2a$12$hashed',
    firstName: 'John',
    lastName: 'Doe',
    isActive: true,
    isVerified: false,
    lastLoginAt: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  }
}

function makeProfile(overrides: Partial<UserProfileRecord> = {}): UserProfileRecord {
  return {
    id: 'profile-1',
    userId: 'user-1',
    avatarUrl: null,
    phone: null,
    bio: null,
    dateOfBirth: null,
    address: null,
    city: null,
    country: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  }
}

function createMockRepo(): IAuthRepository {
  return {
    findUserByEmail: vi.fn().mockResolvedValue(null),
    findUserById: vi.fn().mockResolvedValue(null),
    findUserWithProfile: vi.fn().mockResolvedValue(null),
    createUser: vi.fn(),
    createProfile: vi.fn(),
    updateLastLogin: vi.fn(),
    updateAvatarUrl: vi.fn(),
  }
}

describe('GetMeUseCase', () => {
  let useCase: GetMeUseCase
  let mockRepo: IAuthRepository

  beforeEach(() => {
    Container.reset()
    const container = Container.getInstance()

    container.register(GetMeUseCase, GetMeUseCase)

    mockRepo = createMockRepo()
    container.registerInstance(AUTH_REPOSITORY, mockRepo)

    useCase = container.resolve(GetMeUseCase)
  })

  it('should return user with profile', async () => {
    const userWithProfile = { ...makeUser(), profile: makeProfile({ bio: 'Hello world' }) }
    ;(mockRepo.findUserWithProfile as any).mockResolvedValue(userWithProfile)

    const result = await useCase.execute('user-1')

    expect(result.id).toBe('user-1')
    expect(result.email).toBe('test@example.com')
    expect(result.firstName).toBe('John')
    expect(result.lastName).toBe('Doe')
    expect(result.profile).not.toBeNull()
    expect(result.profile!.bio).toBe('Hello world')
    expect(mockRepo.findUserWithProfile).toHaveBeenCalledWith('user-1')
  })

  it('should return user with null profile when no profile exists', async () => {
    const userWithoutProfile = { ...makeUser(), profile: null }
    ;(mockRepo.findUserWithProfile as any).mockResolvedValue(userWithoutProfile)

    const result = await useCase.execute('user-1')

    expect(result.profile).toBeNull()
  })

  it('should throw 404 when user is not found', async () => {
    ;(mockRepo.findUserWithProfile as any).mockResolvedValue(null)

    await expect(useCase.execute('nonexistent')).rejects.toThrow('User not found')
  })
})
