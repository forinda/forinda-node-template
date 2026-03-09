import { Service, Inject } from '@/core'
import { CategoryId } from '../../domain/value-objects/category-id.vo'
import {
  type ICategoryRepository,
  CATEGORY_REPOSITORY,
} from '../../domain/repositories/category.repository'
import type { UpdateCategoryDTO } from '../dtos/update-category.dto'
import { type CategoryResponseDTO, toCategoryResponse } from '../dtos/category-response.dto'

@Service()
export class UpdateCategoryUseCase {
  constructor(@Inject(CATEGORY_REPOSITORY) private readonly categoryRepo: ICategoryRepository) {}

  async execute(id: string, dto: UpdateCategoryDTO): Promise<CategoryResponseDTO> {
    const category = await this.categoryRepo.findById(CategoryId.from(id))
    if (!category) {
      throw new Error(`Category not found: ${id}`)
    }

    if (dto.name) category.changeName(dto.name)
    if (dto.description !== undefined) category.changeDescription(dto.description)

    await this.categoryRepo.save(category)
    return toCategoryResponse(category)
  }
}
