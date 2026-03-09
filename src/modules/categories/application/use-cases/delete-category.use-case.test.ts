import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DeleteCategoryUseCase } from './delete-category.use-case'
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

describe('DeleteCategoryUseCase', () => {
  let useCase: DeleteCategoryUseCase
  let mockRepo: ICategoryRepository

  beforeEach(() => {
    mockRepo = createMockRepo()
    useCase = new (DeleteCategoryUseCase as any)(mockRepo)
  })

  it('should delete an existing category', async () => {
    const category = Category.create({ name: 'ToDelete', description: '' })
    ;(mockRepo.findById as any).mockResolvedValue(category)

    await useCase.execute(category.id.toString())

    expect(mockRepo.delete).toHaveBeenCalledWith(category.id)
  })

  it('should throw when the category is not found', async () => {
    await expect(useCase.execute('missing-id')).rejects.toThrow(
      'Category not found: missing-id',
    )
    expect(mockRepo.delete).not.toHaveBeenCalled()
  })

  it('should throw for an empty id', async () => {
    await expect(useCase.execute('')).rejects.toThrow('CategoryId cannot be empty')
  })
})
