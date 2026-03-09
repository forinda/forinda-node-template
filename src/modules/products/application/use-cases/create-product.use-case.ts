import { Service } from '@/core'
import { ProductDomainService } from '../../domain/services/product-domain.service'
import type { CreateProductDTO } from '../dtos/create-product.dto'
import { type ProductResponseDTO, toProductResponse } from '../dtos/product-response.dto'

@Service()
export class CreateProductUseCase {
  constructor(private readonly productDomainService: ProductDomainService) {}

  async execute(dto: CreateProductDTO): Promise<ProductResponseDTO> {
    const product = await this.productDomainService.createProduct(dto)
    return toProductResponse(product)
  }
}
