import { Controller, Autowired, RequestContext, Get, Post, Put, Delete } from '@/core'
import { CreateProductUseCase } from '../application/use-cases/create-product.use-case'
import { GetProductUseCase } from '../application/use-cases/get-product.use-case'
import { ListProductsUseCase } from '../application/use-cases/list-products.use-case'
import { UpdateProductUseCase } from '../application/use-cases/update-product.use-case'
import { DeleteProductUseCase } from '../application/use-cases/delete-product.use-case'
import { createProductSchema, type CreateProductDTO } from '../application/dtos/create-product.dto'
import { updateProductSchema, type UpdateProductDTO } from '../application/dtos/update-product.dto'

@Controller({})
export class ProductController {
  @Autowired() private createProductUseCase!: CreateProductUseCase
  @Autowired() private getProductUseCase!: GetProductUseCase
  @Autowired() private listProductsUseCase!: ListProductsUseCase
  @Autowired() private updateProductUseCase!: UpdateProductUseCase
  @Autowired() private deleteProductUseCase!: DeleteProductUseCase

  @Post('/', { body: createProductSchema })
  async create(ctx: RequestContext<CreateProductDTO>) {
    const product = await this.createProductUseCase.execute(ctx.body)
    ctx.created(product)
  }

  @Get('/')
  async list(ctx: RequestContext<unknown, unknown, { categoryId?: string }>) {
    const products = await this.listProductsUseCase.execute(ctx.query.categoryId)
    ctx.json(products)
  }

  @Get('/:id')
  async getById(ctx: RequestContext<unknown, { id: string }>) {
    const product = await this.getProductUseCase.execute(ctx.params.id)
    if (!product) return ctx.notFound('Product not found')
    ctx.json(product)
  }

  @Put('/:id', { body: updateProductSchema })
  async update(ctx: RequestContext<UpdateProductDTO, { id: string }>) {
    const product = await this.updateProductUseCase.execute(ctx.params.id, ctx.body)
    ctx.json(product)
  }

  @Delete('/:id')
  async delete(ctx: RequestContext<unknown, { id: string }>) {
    await this.deleteProductUseCase.execute(ctx.params.id)
    ctx.noContent()
  }
}
