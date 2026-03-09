import { Product } from '../../domain/entities/product.entity'

export interface ProductResponseDTO {
  id: string
  name: string
  description: string
  price: { amount: number; currency: string }
  categoryId: string
  stock: number
  createdAt: string
  updatedAt: string
}

export function toProductResponse(product: Product): ProductResponseDTO {
  return product.toJSON()
}
