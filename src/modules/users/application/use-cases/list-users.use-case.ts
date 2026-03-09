import { Service, Inject } from '@/core'
import { type IUserRepository, USER_REPOSITORY } from '../../domain/repositories/user.repository'
import { type UserResponseDTO, toUserResponse } from '../dtos/user-response.dto'

@Service()
export class ListUsersUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository) {}

  async execute(): Promise<UserResponseDTO[]> {
    const users = await this.userRepo.findAll()
    return users.map(toUserResponse)
  }
}
