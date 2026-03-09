import { Controller, Autowired, RequestContext, Get, Post, Put, Delete } from '@/core'
import { CreateCategoryUseCase } from '../application/use-cases/create-category.use-case'
import { GetCategoryUseCase } from '../application/use-cases/get-category.use-case'
import { ListCategoriesUseCase } from '../application/use-cases/list-categories.use-case'
import { UpdateCategoryUseCase } from '../application/use-cases/update-category.use-case'
import { DeleteCategoryUseCase } from '../application/use-cases/delete-category.use-case'
import {
  createCategorySchema,
  type CreateCategoryDTO,
} from '../application/dtos/create-category.dto'
import {
  updateCategorySchema,
  type UpdateCategoryDTO,
} from '../application/dtos/update-category.dto'

@Controller()
export class CategoryController {
  @Autowired() private createCategoryUseCase!: CreateCategoryUseCase
  @Autowired() private getCategoryUseCase!: GetCategoryUseCase
  @Autowired() private listCategoriesUseCase!: ListCategoriesUseCase
  @Autowired() private updateCategoryUseCase!: UpdateCategoryUseCase
  @Autowired() private deleteCategoryUseCase!: DeleteCategoryUseCase

  @Post('/', { body: createCategorySchema })
  async create(ctx: RequestContext<CreateCategoryDTO>) {
    const category = await this.createCategoryUseCase.execute(ctx.body)
    ctx.created(category)
  }

  @Get('/')
  async list(ctx: RequestContext) {
    const categories = await this.listCategoriesUseCase.execute()
    ctx.json(categories)
  }

  @Get('/:id')
  async getById(ctx: RequestContext<unknown, { id: string }>) {
    const category = await this.getCategoryUseCase.execute(ctx.params.id)
    if (!category) return ctx.notFound('Category not found')
    ctx.json(category)
  }

  @Put('/:id', { body: updateCategorySchema })
  async update(ctx: RequestContext<UpdateCategoryDTO, { id: string }>) {
    const category = await this.updateCategoryUseCase.execute(ctx.params.id, ctx.body)
    ctx.json(category)
  }

  @Delete('/:id')
  async delete(ctx: RequestContext<unknown, { id: string }>) {
    await this.deleteCategoryUseCase.execute(ctx.params.id)
    ctx.noContent()
  }
}
