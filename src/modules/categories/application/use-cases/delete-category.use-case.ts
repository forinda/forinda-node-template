import { Service, Inject } from '@/core'
import { CategoryId } from '../../domain/value-objects/category-id.vo'
import {
  type ICategoryRepository,
  CATEGORY_REPOSITORY,
} from '../../domain/repositories/category.repository'

@Service()
export class DeleteCategoryUseCase {
  constructor(@Inject(CATEGORY_REPOSITORY) private readonly categoryRepo: ICategoryRepository) {}

  async execute(id: string): Promise<void> {
    const category = await this.categoryRepo.findById(CategoryId.from(id))
    if (!category) {
      throw new Error(`Category not found: ${id}`)
    }
    await this.categoryRepo.delete(category.id)
  }
}
