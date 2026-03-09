import { Service, Inject } from '@/core'
import { AuthService } from '../../domain/services/auth.service'
import { AUTH_REPOSITORY, type IAuthRepository } from '../../domain/repositories/auth.repository'
import { type LoginDTO } from '../dtos/login.dto'
import { type AuthResponseDTO, toAuthResponse } from '../dtos/auth-response.dto'

@Service()
export class LoginUseCase {
  constructor(
    @Inject(AUTH_REPOSITORY) private readonly authRepo: IAuthRepository,
    private readonly authService: AuthService,
  ) {}

  async execute(dto: LoginDTO): Promise<AuthResponseDTO> {
    const user = await this.authRepo.findUserByEmail(dto.email)
    if (!user) {
      throw Object.assign(new Error('Invalid email or password'), { status: 401 })
    }

    if (!user.isActive) {
      throw Object.assign(new Error('Account is deactivated'), { status: 403 })
    }

    const valid = await this.authService.comparePassword(dto.password, user.password)
    if (!valid) {
      throw Object.assign(new Error('Invalid email or password'), { status: 401 })
    }

    await this.authRepo.updateLastLogin(user.id)

    const token = this.authService.generateToken({
      sub: user.id,
      email: user.email,
    })

    return toAuthResponse(user, token)
  }
}
