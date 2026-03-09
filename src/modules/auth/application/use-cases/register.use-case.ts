import { Service, Inject, Transactional } from '@/core'
import { AuthService } from '../../domain/services/auth.service'
import { AUTH_REPOSITORY, type IAuthRepository } from '../../domain/repositories/auth.repository'
import { type RegisterDTO } from '../dtos/register.dto'
import { type AuthResponseDTO, toAuthResponse } from '../dtos/auth-response.dto'

@Service()
export class RegisterUseCase {
  constructor(
    @Inject(AUTH_REPOSITORY) private readonly authRepo: IAuthRepository,
    private readonly authService: AuthService,
  ) {}

  @Transactional()
  async execute(dto: RegisterDTO): Promise<AuthResponseDTO> {
    const existing = await this.authRepo.findUserByEmail(dto.email)
    if (existing) {
      throw Object.assign(new Error('Email already in use'), { status: 409 })
    }

    const hashedPassword = await this.authService.hashPassword(dto.password)

    const user = await this.authRepo.createUser({
      email: dto.email,
      password: hashedPassword,
      firstName: dto.firstName,
      lastName: dto.lastName,
    })

    await this.authRepo.createProfile(user.id)

    const token = this.authService.generateToken({
      sub: user.id,
      email: user.email,
    })

    return toAuthResponse(user, token)
  }
}
