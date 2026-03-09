import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Container, TRANSACTION_MANAGER, AuditService } from '@/core'
import type { TransactionManager } from '@/core'
import { AuthService } from '../../domain/services/auth.service'
import {
  AUTH_REPOSITORY,
  type IAuthRepository,
  type UserRecord,
  type UserProfileRecord,
} from '../../domain/repositories/auth.repository'
import { RegisterUseCase } from './register.use-case'

function makeUser(overrides: Partial<UserRecord> = {}): UserRecord {
  return {
    id: 'user-1',
    email: 'test@example.com',
    password: '$2a$12$hashedpassword',
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
    createUser: vi.fn().mockImplementation(async (data) =>
      makeUser({ email: data.email, firstName: data.firstName, lastName: data.lastName }),
    ),
    createProfile: vi.fn().mockResolvedValue(makeProfile()),
    updateLastLogin: vi.fn().mockResolvedValue(undefined),
    updateAvatarUrl: vi.fn().mockResolvedValue(makeProfile()),
  }
}

function createMockTxManager(): TransactionManager {
  return {
    begin: vi.fn().mockResolvedValue(Symbol('tx')),
    commit: vi.fn().mockResolvedValue(undefined),
    rollback: vi.fn().mockResolvedValue(undefined),
  }
}

describe('RegisterUseCase', () => {
  let useCase: RegisterUseCase
  let mockRepo: IAuthRepository

  beforeEach(() => {
    Container.reset()
    const container = Container.getInstance()

    container.register(AuthService, AuthService)
    container.register(AuditService, AuditService)
    container.register(RegisterUseCase, RegisterUseCase)

    mockRepo = createMockRepo()
    container.registerInstance(AUTH_REPOSITORY, mockRepo)
    container.registerInstance(TRANSACTION_MANAGER, createMockTxManager())

    useCase = container.resolve(RegisterUseCase)
  })

  it('should register a new user and return token + user', async () => {
    const result = await useCase.execute({
      email: 'new@example.com',
      password: 'password123',
      firstName: 'Jane',
      lastName: 'Doe',
    })

    expect(result.token).toBeTruthy()
    expect(result.token.split('.')).toHaveLength(3) // JWT format
    expect(result.user.email).toBe('new@example.com')
    expect(result.user.firstName).toBe('Jane')
    expect(result.user.lastName).toBe('Doe')
    expect(mockRepo.createUser).toHaveBeenCalledTimes(1)
    expect(mockRepo.createProfile).toHaveBeenCalledTimes(1)
  })

  it('should hash the password before storing', async () => {
    await useCase.execute({
      email: 'new@example.com',
      password: 'password123',
      firstName: 'Jane',
      lastName: 'Doe',
    })

    const createUserCall = (mockRepo.createUser as any).mock.calls[0][0]
    expect(createUserCall.password).not.toBe('password123')
    expect(createUserCall.password).toMatch(/^\$2[aby]\$/)
  })

  it('should throw 409 when email is already in use', async () => {
    ;(mockRepo.findUserByEmail as any).mockResolvedValue(makeUser())

    await expect(
      useCase.execute({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      }),
    ).rejects.toThrow('Email already in use')

    expect(mockRepo.createUser).not.toHaveBeenCalled()
  })
})
