import { Service, Inject } from '@/core'
import {
  type IProductRepository,
  PRODUCT_REPOSITORY,
} from '../../domain/repositories/product.repository'
import { type ProductResponseDTO, toProductResponse } from '../dtos/product-response.dto'

@Service()
export class ListProductsUseCase {
  constructor(@Inject(PRODUCT_REPOSITORY) private readonly productRepo: IProductRepository) {}

  async execute(categoryId?: string): Promise<ProductResponseDTO[]> {
    const products = categoryId
      ? await this.productRepo.findByCategoryId(categoryId)
      : await this.productRepo.findAll()
    return products.map(toProductResponse)
  }
}
