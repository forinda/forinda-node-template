import { Controller, Autowired, RequestContext, Get, Post, Put, Delete } from '@/core'
import { CreateUserUseCase } from '../application/use-cases/create-user.use-case'
import { GetUserUseCase } from '../application/use-cases/get-user.use-case'
import { ListUsersUseCase } from '../application/use-cases/list-users.use-case'
import { UpdateUserUseCase } from '../application/use-cases/update-user.use-case'
import { DeleteUserUseCase } from '../application/use-cases/delete-user.use-case'
import { createUserSchema, type CreateUserDTO } from '../application/dtos/create-user.dto'
import { updateUserSchema, type UpdateUserDTO } from '../application/dtos/update-user.dto'

@Controller()
export class UserController {
  @Autowired() private createUserUseCase!: CreateUserUseCase
  @Autowired() private getUserUseCase!: GetUserUseCase
  @Autowired() private listUsersUseCase!: ListUsersUseCase
  @Autowired() private updateUserUseCase!: UpdateUserUseCase
  @Autowired() private deleteUserUseCase!: DeleteUserUseCase

  @Post('/', { body: createUserSchema })
  async create(ctx: RequestContext<CreateUserDTO>) {
    const user = await this.createUserUseCase.execute(ctx.body)
    ctx.created(user)
  }

  @Get('/')
  async list(ctx: RequestContext) {
    const users = await this.listUsersUseCase.execute()
    ctx.json(users)
  }

  @Get('/:id')
  async getById(ctx: RequestContext<unknown, { id: string }>) {
    const user = await this.getUserUseCase.execute(ctx.params.id)
    if (!user) return ctx.notFound('User not found')
    ctx.json(user)
  }

  @Put('/:id', { body: updateUserSchema })
  async update(ctx: RequestContext<UpdateUserDTO, { id: string }>) {
    const user = await this.updateUserUseCase.execute(ctx.params.id, ctx.body)
    ctx.json(user)
  }

  @Delete('/:id')
  async delete(ctx: RequestContext<unknown, { id: string }>) {
    await this.deleteUserUseCase.execute(ctx.params.id)
    ctx.noContent()
  }
}
