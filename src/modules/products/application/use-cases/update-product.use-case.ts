import { Service, Inject } from '@/core'
import { ProductId } from '../../domain/value-objects/product-id.vo'
import {
  type IProductRepository,
  PRODUCT_REPOSITORY,
} from '../../domain/repositories/product.repository'
import type { UpdateProductDTO } from '../dtos/update-product.dto'
import { type ProductResponseDTO, toProductResponse } from '../dtos/product-response.dto'

@Service()
export class UpdateProductUseCase {
  constructor(@Inject(PRODUCT_REPOSITORY) private readonly productRepo: IProductRepository) {}

  async execute(id: string, dto: UpdateProductDTO): Promise<ProductResponseDTO> {
    const product = await this.productRepo.findById(ProductId.from(id))
    if (!product) {
      throw new Error(`Product not found: ${id}`)
    }

    if (dto.name) product.changeName(dto.name)
    if (dto.description !== undefined) product.changeDescription(dto.description)
    if (dto.price !== undefined) product.changePrice(dto.price, dto.currency)
    if (dto.categoryId) product.changeCategory(dto.categoryId)
    if (dto.stock !== undefined) product.adjustStock(dto.stock - product.stock)

    await this.productRepo.save(product)
    return toProductResponse(product)
  }
}
