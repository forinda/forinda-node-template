import { Service } from '@/core'
import { UserDomainService } from '../../domain/services/user-domain.service'
import type { CreateUserDTO } from '../dtos/create-user.dto'
import { type UserResponseDTO, toUserResponse } from '../dtos/user-response.dto'

/**
 * Single Responsibility — this use case only handles user creation.
 * Open/Closed — extend by creating new use cases, not modifying this one.
 */
@Service()
export class CreateUserUseCase {
  constructor(private readonly userDomainService: UserDomainService) {}

  async execute(dto: CreateUserDTO): Promise<UserResponseDTO> {
    const user = await this.userDomainService.createUser(dto.name, dto.email)
    return toUserResponse(user)
  }
}
