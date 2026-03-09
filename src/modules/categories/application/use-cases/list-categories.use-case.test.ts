import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ListCategoriesUseCase } from './list-categories.use-case'
import type { ICategoryRepository } from '../../domain/repositories/category.repository'
import { Category } from '../../domain/entities/category.entity'

function createMockRepo(): ICategoryRepository {
  return {
    findById: vi.fn().mockResolvedValue(null),
    findByName: vi.fn().mockResolvedValue(null),
    findAll: vi.fn().mockResolvedValue([]),
    save: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
  }
}

describe('ListCategoriesUseCase', () => {
  let useCase: ListCategoriesUseCase
  let mockRepo: ICategoryRepository

  beforeEach(() => {
    mockRepo = createMockRepo()
    useCase = new (ListCategoriesUseCase as any)(mockRepo)
  })

  it('should return an empty array when no categories exist', async () => {
    const result = await useCase.execute()
    expect(result).toEqual([])
  })

  it('should return all categories as DTOs', async () => {
    const categories = [
      Category.create({ name: 'Books', description: 'All books' }),
      Category.create({ name: 'Music', description: 'All music' }),
    ]
    ;(mockRepo.findAll as any).mockResolvedValue(categories)

    const result = await useCase.execute()

    expect(result).toHaveLength(2)
    expect(result[0].name).toBe('Books')
    expect(result[1].name).toBe('Music')
    expect(result[0]).toHaveProperty('id')
    expect(result[0]).toHaveProperty('createdAt')
    expect(result[0]).toHaveProperty('updatedAt')
  })
})
