import { Service, Inject, HttpException } from '@/core'
import { Product } from '../entities/product.entity'
import { type IProductRepository, PRODUCT_REPOSITORY } from '../repositories/product.repository'
import {
  type ICategoryRepository,
  CATEGORY_REPOSITORY,
} from '@/modules/categories/domain/repositories/category.repository'
import { CategoryId } from '@/modules/categories/domain/value-objects/category-id.vo'

@Service()
export class ProductDomainService {
  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly productRepo: IProductRepository,
    @Inject(CATEGORY_REPOSITORY) private readonly categoryRepo: ICategoryRepository,
  ) {}

  async createProduct(params: {
    name: string
    description: string
    price: number
    currency?: string
    categoryId: string
    stock: number
  }): Promise<Product> {
    // Validate category exists
    const category = await this.categoryRepo.findById(CategoryId.from(params.categoryId))
    if (!category) {
      throw HttpException.notFound(`Category not found: ${params.categoryId}`)
    }

    const product = Product.create(params)
    await this.productRepo.save(product)
    return product
  }
}
