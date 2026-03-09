import { Repository } from '@/core'
import { Category } from '../../domain/entities/category.entity'
import { CategoryId } from '../../domain/value-objects/category-id.vo'
import { CategoryName } from '../../domain/value-objects/category-name.vo'
import type { ICategoryRepository } from '../../domain/repositories/category.repository'

@Repository()
export class InMemoryCategoryRepository implements ICategoryRepository {
  private store = new Map<string, Category>()

  async findById(id: CategoryId): Promise<Category | null> {
    return this.store.get(id.toString()) ?? null
  }

  async findByName(name: CategoryName): Promise<Category | null> {
    for (const category of this.store.values()) {
      if (category.name.equals(name)) return category
    }
    return null
  }

  async findAll(): Promise<Category[]> {
    return Array.from(this.store.values())
  }

  async save(category: Category): Promise<void> {
    this.store.set(category.id.toString(), category)
  }

  async delete(id: CategoryId): Promise<void> {
    this.store.delete(id.toString())
  }
}
