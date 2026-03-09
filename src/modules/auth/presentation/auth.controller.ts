import {
  Controller,
  Autowired,
  Get,
  Post,
  Patch,
  Middleware,
  FileUpload,
  RequestContext,
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
} from '@/core'
import { RegisterUseCase } from '../application/use-cases/register.use-case'
import { LoginUseCase } from '../application/use-cases/login.use-case'
import { GetMeUseCase } from '../application/use-cases/get-me.use-case'
import { UploadAvatarUseCase } from '../application/use-cases/upload-avatar.use-case'
import { registerSchema, type RegisterDTO } from '../application/dtos/register.dto'
import { loginSchema, type LoginDTO } from '../application/dtos/login.dto'
import { authGuard, AUTH_USER_KEY, type AuthUser } from '../infrastructure/middleware/auth.guard'

@Controller()
@ApiTags('Auth')
export class AuthController {
  @Autowired() private registerUseCase!: RegisterUseCase
  @Autowired() private loginUseCase!: LoginUseCase
  @Autowired() private getMeUseCase!: GetMeUseCase
  @Autowired() private uploadAvatarUseCase!: UploadAvatarUseCase

  @Post('/register', { body: registerSchema })
  @ApiOperation({ summary: 'Register a new user account' })
  async register(ctx: RequestContext<RegisterDTO>) {
    const result = await this.registerUseCase.execute(ctx.body, ctx.req.ip)
    ctx.created(result)
  }

  @Post('/login', { body: loginSchema })
  @ApiOperation({ summary: 'Login with email and password' })
  async login(ctx: RequestContext<LoginDTO>) {
    const result = await this.loginUseCase.execute(ctx.body, ctx.req.ip)
    ctx.json(result)
  }

  @Get('/me')
  @Middleware(authGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user' })
  async me(ctx: RequestContext) {
    const authUser = ctx.get<AuthUser>(AUTH_USER_KEY)!
    const result = await this.getMeUseCase.execute(authUser.sub)
    ctx.json(result)
  }

  @Patch('/me/avatar')
  @Middleware(authGuard)
  @FileUpload({
    mode: 'single',
    fieldName: 'avatar',
    allowedMimeTypes: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    maxSize: 2 * 1024 * 1024,
  })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload profile avatar image' })
  async uploadAvatar(ctx: RequestContext) {
    const authUser = ctx.get<AuthUser>(AUTH_USER_KEY)!
    const file = ctx.file
    if (!file) {
      return ctx.badRequest('No avatar file provided')
    }
    const result = await this.uploadAvatarUseCase.execute(authUser.sub, file)
    ctx.json(result)
  }
}
