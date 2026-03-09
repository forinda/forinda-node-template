import type { UserRecord, UserProfileRecord } from '../../domain/repositories/auth.repository'

export interface AuthResponseDTO {
  token: string
  user: {
    id: string
    email: string
    firstName: string
    lastName: string
    isActive: boolean
    isVerified: boolean
  }
}

export interface MeResponseDTO {
  id: string
  email: string
  firstName: string
  lastName: string
  isActive: boolean
  isVerified: boolean
  lastLoginAt: string | null
  createdAt: string
  profile: {
    avatarUrl: string | null
    phone: string | null
    bio: string | null
    dateOfBirth: string | null
    address: string | null
    city: string | null
    country: string | null
  } | null
}

export function toAuthResponse(user: UserRecord, token: string): AuthResponseDTO {
  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isActive: user.isActive,
      isVerified: user.isVerified,
    },
  }
}

export function toMeResponse(
  user: UserRecord & { profile: UserProfileRecord | null },
): MeResponseDTO {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    isActive: user.isActive,
    isVerified: user.isVerified,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    profile: user.profile
      ? {
          avatarUrl: user.profile.avatarUrl,
          phone: user.profile.phone,
          bio: user.profile.bio,
          dateOfBirth: user.profile.dateOfBirth,
          address: user.profile.address,
          city: user.profile.city,
          country: user.profile.country,
        }
      : null,
  }
}
