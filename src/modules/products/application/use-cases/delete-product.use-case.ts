import { Service, Inject } from '@/core'
import { ProductId } from '../../domain/value-objects/product-id.vo'
import {
  type IProductRepository,
  PRODUCT_REPOSITORY,
} from '../../domain/repositories/product.repository'

@Service()
export class DeleteProductUseCase {
  constructor(@Inject(PRODUCT_REPOSITORY) private readonly productRepo: IProductRepository) {}

  async execute(id: string): Promise<void> {
    const product = await this.productRepo.findById(ProductId.from(id))
    if (!product) {
      throw new Error(`Product not found: ${id}`)
    }
    await this.productRepo.delete(product.id)
  }
}
