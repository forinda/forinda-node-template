import { Service, Inject } from '@/core'
import { UserId } from '../../domain/value-objects/user-id.vo'
import { type IUserRepository, USER_REPOSITORY } from '../../domain/repositories/user.repository'
import type { UpdateUserDTO } from '../dtos/update-user.dto'
import { type UserResponseDTO, toUserResponse } from '../dtos/user-response.dto'

@Service()
export class UpdateUserUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository) {}

  async execute(id: string, dto: UpdateUserDTO): Promise<UserResponseDTO> {
    const user = await this.userRepo.findById(UserId.from(id))
    if (!user) {
      throw new Error(`User not found: ${id}`)
    }

    if (dto.name) user.changeName(dto.name)
    if (dto.email) user.changeEmail(dto.email)

    await this.userRepo.save(user)
    return toUserResponse(user)
  }
}
