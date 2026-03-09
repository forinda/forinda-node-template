import { Service, Inject } from '@/core'
import { UserId } from '../../domain/value-objects/user-id.vo'
import { type IUserRepository, USER_REPOSITORY } from '../../domain/repositories/user.repository'
import { type UserResponseDTO, toUserResponse } from '../dtos/user-response.dto'

@Service()
export class GetUserUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository) {}

  async execute(id: string): Promise<UserResponseDTO | null> {
    const user = await this.userRepo.findById(UserId.from(id))
    return user ? toUserResponse(user) : null
  }
}
