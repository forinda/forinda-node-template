import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Container } from '@/core'
import type { UploadedFile } from '@/core'
import {
  AUTH_REPOSITORY,
  type IAuthRepository,
  type UserRecord,
  type UserProfileRecord,
} from '../../domain/repositories/auth.repository'
import { UploadAvatarUseCase } from './upload-avatar.use-case'

// Mock sharp before importing the use case module
vi.mock('sharp', () => {
  const mockSharp = vi.fn(() => ({
    resize: vi.fn().mockReturnThis(),
    webp: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue(Buffer.from('fake-webp-data')),
  }))
  return { default: mockSharp }
})

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

function createFakeFile(): UploadedFile {
  return {
    fieldname: 'avatar',
    originalname: 'photo.png',
    encoding: '7bit',
    mimetype: 'image/png',
    buffer: Buffer.from('fake-image-data'),
    size: 1024,
  } as UploadedFile
}

describe('UploadAvatarUseCase', () => {
  let useCase: UploadAvatarUseCase
  let mockRepo: IAuthRepository

  beforeEach(() => {
    Container.reset()
    const container = Container.getInstance()

    container.register(UploadAvatarUseCase, UploadAvatarUseCase)

    mockRepo = createMockRepo()
    container.registerInstance(AUTH_REPOSITORY, mockRepo)

    useCase = container.resolve(UploadAvatarUseCase)
  })

  it('should process the image and update avatar URL via repository', async () => {
    const expectedAvatarUrl = `data:image/webp;base64,${Buffer.from('fake-webp-data').toString('base64')}`
    ;(mockRepo.findUserById as any).mockResolvedValue(makeUser())
    ;(mockRepo.updateAvatarUrl as any).mockResolvedValue(
      makeProfile({ avatarUrl: expectedAvatarUrl }),
    )

    const result = await useCase.execute('user-1', createFakeFile())

    expect(result.avatarUrl).toBe(expectedAvatarUrl)
    expect(mockRepo.findUserById).toHaveBeenCalledWith('user-1')
    expect(mockRepo.updateAvatarUrl).toHaveBeenCalledWith('user-1', expectedAvatarUrl)
  })

  it('should throw 404 when user is not found', async () => {
    ;(mockRepo.findUserById as any).mockResolvedValue(null)

    await expect(useCase.execute('nonexistent', createFakeFile())).rejects.toThrow(
      'User not found',
    )

    expect(mockRepo.updateAvatarUrl).not.toHaveBeenCalled()
  })
})
