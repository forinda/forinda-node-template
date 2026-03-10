import { Service, Inject, Transactional, AuditService, HttpException } from '@/core'
import { AuthService } from '../../domain/services/auth.service'
import { AUTH_REPOSITORY, type IAuthRepository } from '../../domain/repositories/auth.repository'
import { type RegisterDTO } from '../dtos/register.dto'
import { type AuthResponseDTO, toAuthResponse } from '../dtos/auth-response.dto'

@Service()
export class RegisterUseCase {
  constructor(
    @Inject(AUTH_REPOSITORY) private readonly authRepo: IAuthRepository,
    private readonly authService: AuthService,
    private readonly audit: AuditService,
  ) {}

  @Transactional()
  async execute(dto: RegisterDTO, ip?: string): Promise<AuthResponseDTO> {
    const existing = await this.authRepo.findUserByEmail(dto.email)
    if (existing) {
      this.audit.failure('auth.register_failed', dto.email, 'Email already in use', { ip })
      throw HttpException.conflict('Email already in use')
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

    this.audit.success('auth.register', user.email, { ip, resourceId: user.id })

    return toAuthResponse(user, token)
  }
}
