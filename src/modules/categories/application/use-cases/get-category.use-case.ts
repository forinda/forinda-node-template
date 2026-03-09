import { Service, Inject } from '@/core'
import { CategoryId } from '../../domain/value-objects/category-id.vo'
import {
  type ICategoryRepository,
  CATEGORY_REPOSITORY,
} from '../../domain/repositories/category.repository'
import { type CategoryResponseDTO, toCategoryResponse } from '../dtos/category-response.dto'

@Service()
export class GetCategoryUseCase {
  constructor(@Inject(CATEGORY_REPOSITORY) private readonly categoryRepo: ICategoryRepository) {}

  async execute(id: string): Promise<CategoryResponseDTO | null> {
    const category = await this.categoryRepo.findById(CategoryId.from(id))
    return category ? toCategoryResponse(category) : null
  }
}
