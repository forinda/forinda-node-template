import { Service, Inject, AuditService, HttpException } from '@/core'
import { AuthService } from '../../domain/services/auth.service'
import { AUTH_REPOSITORY, type IAuthRepository } from '../../domain/repositories/auth.repository'
import { type LoginDTO } from '../dtos/login.dto'
import { type AuthResponseDTO, toAuthResponse } from '../dtos/auth-response.dto'

@Service()
export class LoginUseCase {
  constructor(
    @Inject(AUTH_REPOSITORY) private readonly authRepo: IAuthRepository,
    private readonly authService: AuthService,
    private readonly audit: AuditService,
  ) {}

  async execute(dto: LoginDTO, ip?: string): Promise<AuthResponseDTO> {
    const user = await this.authRepo.findUserByEmail(dto.email)
    if (!user) {
      this.audit.failure('auth.login_failed', dto.email, 'User not found', { ip })
      throw HttpException.unauthorized('Invalid email or password')
    }

    if (!user.isActive) {
      this.audit.failure('auth.login_failed', dto.email, 'Account deactivated', { ip })
      throw HttpException.forbidden('Account is deactivated')
    }

    const valid = await this.authService.comparePassword(dto.password, user.password)
    if (!valid) {
      this.audit.failure('auth.login_failed', dto.email, 'Invalid password', { ip })
      throw HttpException.unauthorized('Invalid email or password')
    }

    await this.authRepo.updateLastLogin(user.id)

    const token = this.authService.generateToken({
      sub: user.id,
      email: user.email,
    })

    this.audit.success('auth.login', user.email, { ip, resourceId: user.id })

    return toAuthResponse(user, token)
  }
}
