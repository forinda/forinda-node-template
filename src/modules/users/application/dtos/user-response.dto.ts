import { User } from '../../domain/entities/user.entity'

export interface UserResponseDTO {
  id: string
  name: string
  email: string
  createdAt: string
  updatedAt: string
}

export function toUserResponse(user: User): UserResponseDTO {
  return user.toJSON()
}
