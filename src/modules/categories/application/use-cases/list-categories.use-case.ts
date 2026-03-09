import { Service, Inject } from '@/core'
import {
  type ICategoryRepository,
  CATEGORY_REPOSITORY,
} from '../../domain/repositories/category.repository'
import { type CategoryResponseDTO, toCategoryResponse } from '../dtos/category-response.dto'

@Service()
export class ListCategoriesUseCase {
  constructor(@Inject(CATEGORY_REPOSITORY) private readonly categoryRepo: ICategoryRepository) {}

  async execute(): Promise<CategoryResponseDTO[]> {
    const categories = await this.categoryRepo.findAll()
    return categories.map(toCategoryResponse)
  }
}
