import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GetCategoryUseCase } from './get-category.use-case'
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

describe('GetCategoryUseCase', () => {
  let useCase: GetCategoryUseCase
  let mockRepo: ICategoryRepository

  beforeEach(() => {
    mockRepo = createMockRepo()
    useCase = new (GetCategoryUseCase as any)(mockRepo)
  })

  it('should return a category DTO when found', async () => {
    const category = Category.create({ name: 'Books', description: 'All books' })
    ;(mockRepo.findById as any).mockResolvedValue(category)

    const result = await useCase.execute(category.id.toString())

    expect(result).not.toBeNull()
    expect(result!.name).toBe('Books')
    expect(result!.description).toBe('All books')
  })

  it('should return null when category is not found', async () => {
    const result = await useCase.execute('non-existent-id')
    expect(result).toBeNull()
  })

  it('should throw for an empty id', async () => {
    await expect(useCase.execute('')).rejects.toThrow('CategoryId cannot be empty')
  })
})
