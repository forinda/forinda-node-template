import { Service } from '@/core'
import { CategoryDomainService } from '../../domain/services/category-domain.service'
import type { CreateCategoryDTO } from '../dtos/create-category.dto'
import { type CategoryResponseDTO, toCategoryResponse } from '../dtos/category-response.dto'

@Service()
export class CreateCategoryUseCase {
  constructor(private readonly categoryDomainService: CategoryDomainService) {}

  async execute(dto: CreateCategoryDTO): Promise<CategoryResponseDTO> {
    const category = await this.categoryDomainService.createCategory(dto.name, dto.description)
    return toCategoryResponse(category)
  }
}
