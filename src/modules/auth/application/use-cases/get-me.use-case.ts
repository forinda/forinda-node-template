import { Service, Inject, HttpException } from '@/core'
import { AUTH_REPOSITORY, type IAuthRepository } from '../../domain/repositories/auth.repository'
import { type MeResponseDTO, toMeResponse } from '../dtos/auth-response.dto'

@Service()
export class GetMeUseCase {
  constructor(@Inject(AUTH_REPOSITORY) private readonly authRepo: IAuthRepository) {}

  async execute(userId: string): Promise<MeResponseDTO> {
    const user = await this.authRepo.findUserWithProfile(userId)
    if (!user) {
      throw HttpException.notFound('User not found')
    }
    return toMeResponse(user)
  }
}
