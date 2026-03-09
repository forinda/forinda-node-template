import { Service, Inject } from '@/core'
import { Category } from '../entities/category.entity'
import { CategoryName } from '../value-objects/category-name.vo'
import { type ICategoryRepository, CATEGORY_REPOSITORY } from '../repositories/category.repository'

@Service()
export class CategoryDomainService {
  constructor(@Inject(CATEGORY_REPOSITORY) private readonly categoryRepo: ICategoryRepository) {}

  async ensureNameUnique(name: string): Promise<void> {
    const existing = await this.categoryRepo.findByName(CategoryName.create(name))
    if (existing) {
      throw new Error(`Category already exists: ${name}`)
    }
  }

  async createCategory(name: string, description: string): Promise<Category> {
    await this.ensureNameUnique(name)
    const category = Category.create({ name, description })
    await this.categoryRepo.save(category)
    return category
  }
}
