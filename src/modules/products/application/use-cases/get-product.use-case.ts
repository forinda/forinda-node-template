import { Service, Inject } from '@/core'
import { ProductId } from '../../domain/value-objects/product-id.vo'
import {
  type IProductRepository,
  PRODUCT_REPOSITORY,
} from '../../domain/repositories/product.repository'
import { type ProductResponseDTO, toProductResponse } from '../dtos/product-response.dto'

@Service()
export class GetProductUseCase {
  constructor(@Inject(PRODUCT_REPOSITORY) private readonly productRepo: IProductRepository) {}

  async execute(id: string): Promise<ProductResponseDTO | null> {
    const product = await this.productRepo.findById(ProductId.from(id))
    return product ? toProductResponse(product) : null
  }
}
