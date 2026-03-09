import { Category } from '../../domain/entities/category.entity'

export interface CategoryResponseDTO {
  id: string
  name: string
  description: string
  createdAt: string
  updatedAt: string
}

export function toCategoryResponse(category: Category): CategoryResponseDTO {
  return category.toJSON()
}
