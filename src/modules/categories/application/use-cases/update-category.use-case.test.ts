import { describe, it, expect, beforeEach, vi } from 'vitest'
import { UpdateCategoryUseCase } from './update-category.use-case'
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

describe('UpdateCategoryUseCase', () => {
  let useCase: UpdateCategoryUseCase
  let mockRepo: ICategoryRepository

  beforeEach(() => {
    mockRepo = createMockRepo()
    useCase = new (UpdateCategoryUseCase as any)(mockRepo)
  })

  it('should update the name of an existing category', async () => {
    const category = Category.create({ name: 'Old Name', description: 'Desc' })
    ;(mockRepo.findById as any).mockResolvedValue(category)

    const result = await useCase.execute(category.id.toString(), { name: 'New Name' })

    expect(result.name).toBe('New Name')
    expect(mockRepo.save).toHaveBeenCalled()
  })

  it('should update the description of an existing category', async () => {
    const category = Category.create({ name: 'Test', description: 'Old desc' })
    ;(mockRepo.findById as any).mockResolvedValue(category)

    const result = await useCase.execute(category.id.toString(), { description: 'New desc' })

    expect(result.description).toBe('New desc')
    expect(mockRepo.save).toHaveBeenCalled()
  })

  it('should update both name and description', async () => {
    const category = Category.create({ name: 'Old', description: 'Old desc' })
    ;(mockRepo.findById as any).mockResolvedValue(category)

    const result = await useCase.execute(category.id.toString(), {
      name: 'New',
      description: 'New desc',
    })

    expect(result.name).toBe('New')
    expect(result.description).toBe('New desc')
  })

  it('should throw when the category is not found', async () => {
    await expect(useCase.execute('missing-id', { name: 'X' })).rejects.toThrow(
      'Category not found: missing-id',
    )
    expect(mockRepo.save).not.toHaveBeenCalled()
  })

  it('should not modify fields that are not provided', async () => {
    const category = Category.create({ name: 'Keep', description: 'Keep desc' })
    ;(mockRepo.findById as any).mockResolvedValue(category)

    const result = await useCase.execute(category.id.toString(), {})

    expect(result.name).toBe('Keep')
    expect(result.description).toBe('Keep desc')
  })
})
