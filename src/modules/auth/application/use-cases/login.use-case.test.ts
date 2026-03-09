import { describe, it, expect, beforeEach, vi } from 'vitest'
import bcrypt from 'bcryptjs'
import { Container } from '@/core'
import { AuthService } from '../../domain/services/auth.service'
import {
  AUTH_REPOSITORY,
  type IAuthRepository,
  type UserRecord,
  type UserProfileRecord,
} from '../../domain/repositories/auth.repository'
import { LoginUseCase } from './login.use-case'

function makeUser(overrides: Partial<UserRecord> = {}): UserRecord {
  return {
    id: 'user-1',
    email: 'test@example.com',
    password: '$2a$12$placeholder',
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

function createMockRepo(): IAuthRepository {
  return {
    findUserByEmail: vi.fn().mockResolvedValue(null),
    findUserById: vi.fn().mockResolvedValue(null),
    findUserWithProfile: vi.fn().mockResolvedValue(null),
    createUser: vi.fn(),
    createProfile: vi.fn(),
    updateLastLogin: vi.fn().mockResolvedValue(undefined),
    updateAvatarUrl: vi.fn(),
  }
}

describe('LoginUseCase', () => {
  let useCase: LoginUseCase
  let mockRepo: IAuthRepository
  let hashedPassword: string

  beforeEach(async () => {
    Container.reset()
    const container = Container.getInstance()

    container.register(AuthService, AuthService)
    container.register(LoginUseCase, LoginUseCase)

    mockRepo = createMockRepo()
    container.registerInstance(AUTH_REPOSITORY, mockRepo)

    // Pre-hash a known password for test users
    hashedPassword = await bcrypt.hash('correct-password', 10)

    useCase = container.resolve(LoginUseCase)
  })

  it('should return a token and user on successful login', async () => {
    const user = makeUser({ password: hashedPassword })
    ;(mockRepo.findUserByEmail as any).mockResolvedValue(user)

    const result = await useCase.execute({
      email: 'test@example.com',
      password: 'correct-password',
    })

    expect(result.token).toBeTruthy()
    expect(result.token.split('.')).toHaveLength(3)
    expect(result.user.id).toBe('user-1')
    expect(result.user.email).toBe('test@example.com')
    expect(mockRepo.updateLastLogin).toHaveBeenCalledWith('user-1')
  })

  it('should throw 401 for non-existent user', async () => {
    ;(mockRepo.findUserByEmail as any).mockResolvedValue(null)

    await expect(
      useCase.execute({ email: 'nobody@example.com', password: 'anything' }),
    ).rejects.toThrow('Invalid email or password')
  })

  it('should throw 401 for wrong password', async () => {
    const user = makeUser({ password: hashedPassword })
    ;(mockRepo.findUserByEmail as any).mockResolvedValue(user)

    await expect(
      useCase.execute({ email: 'test@example.com', password: 'wrong-password' }),
    ).rejects.toThrow('Invalid email or password')
  })

  it('should throw 403 for deactivated account', async () => {
    const user = makeUser({ password: hashedPassword, isActive: false })
    ;(mockRepo.findUserByEmail as any).mockResolvedValue(user)

    await expect(
      useCase.execute({ email: 'test@example.com', password: 'correct-password' }),
    ).rejects.toThrow('Account is deactivated')
  })
})
