import type { InferSelectModel } from 'drizzle-orm'
import type { users, userProfiles } from '@/db/schema'

export type UserRecord = InferSelectModel<typeof users>
export type UserProfileRecord = InferSelectModel<typeof userProfiles>

export interface CreateUserData {
  email: string
  password: string
  firstName: string
  lastName: string
}

export interface IAuthRepository {
  findUserByEmail(email: string): Promise<UserRecord | null>
  findUserById(id: string): Promise<UserRecord | null>
  findUserWithProfile(
    id: string,
  ): Promise<(UserRecord & { profile: UserProfileRecord | null }) | null>
  createUser(data: CreateUserData): Promise<UserRecord>
  createProfile(userId: string): Promise<UserProfileRecord>
  updateLastLogin(userId: string): Promise<void>
  updateAvatarUrl(userId: string, avatarUrl: string): Promise<UserProfileRecord>
}

export const AUTH_REPOSITORY = Symbol('IAuthRepository')
