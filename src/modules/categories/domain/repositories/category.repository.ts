import { Category } from '../entities/category.entity'
import { CategoryId } from '../value-objects/category-id.vo'
import { CategoryName } from '../value-objects/category-name.vo'

export interface ICategoryRepository {
  findById(id: CategoryId): Promise<Category | null>
  findByName(name: CategoryName): Promise<Category | null>
  findAll(): Promise<Category[]>
  save(category: Category): Promise<void>
  delete(id: CategoryId): Promise<void>
}

export const CATEGORY_REPOSITORY = Symbol('ICategoryRepository')
