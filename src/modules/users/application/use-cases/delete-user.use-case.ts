import { Service, Inject, HttpException } from '@/core'
import { UserId } from '../../domain/value-objects/user-id.vo'
import { type IUserRepository, USER_REPOSITORY } from '../../domain/repositories/user.repository'

@Service()
export class DeleteUserUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository) {}

  async execute(id: string): Promise<void> {
    const user = await this.userRepo.findById(UserId.from(id))
    if (!user) {
      throw HttpException.notFound(`User not found: ${id}`)
    }
    await this.userRepo.delete(user.id)
  }
}
