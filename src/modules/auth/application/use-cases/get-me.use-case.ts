import { Service, Inject } from '@/core'
import { AUTH_REPOSITORY, type IAuthRepository } from '../../domain/repositories/auth.repository'
import { type MeResponseDTO, toMeResponse } from '../dtos/auth-response.dto'

@Service()
export class GetMeUseCase {
  constructor(@Inject(AUTH_REPOSITORY) private readonly authRepo: IAuthRepository) {}

  async execute(userId: string): Promise<MeResponseDTO> {
    const user = await this.authRepo.findUserWithProfile(userId)
    if (!user) {
      throw Object.assign(new Error('User not found'), { status: 404 })
    }
    return toMeResponse(user)
  }
}
