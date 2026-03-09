import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CategoryDomainService } from './category-domain.service'
import type { ICategoryRepository } from '../repositories/category.repository'
import { Category } from '../entities/category.entity'
import { CategoryName } from '../value-objects/category-name.vo'

function createMockRepository(): ICategoryRepository {
  return {
    findById: vi.fn().mockResolvedValue(null),
    findByName: vi.fn().mockResolvedValue(null),
    findAll: vi.fn().mockResolvedValue([]),
    save: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
  }
}

describe('CategoryDomainService', () => {
  let service: CategoryDomainService
  let mockRepo: ICategoryRepository

  beforeEach(() => {
    mockRepo = createMockRepository()
    // Bypass DI: construct directly with mock repo
    service = new (CategoryDomainService as any)(mockRepo)
  })

  describe('createCategory', () => {
    it('should create and save a new category', async () => {
      const result = await service.createCategory('Electronics', 'Devices and gadgets')

      expect(result).toBeInstanceOf(Category)
      expect(result.name.toString()).toBe('Electronics')
      expect(result.description).toBe('Devices and gadgets')
      expect(mockRepo.save).toHaveBeenCalledWith(result)
    })

    it('should check for name uniqueness before creating', async () => {
      await service.createCategory('Books', 'All books')

      expect(mockRepo.findByName).toHaveBeenCalledTimes(1)
      // Verify it was called with a CategoryName value object
      const callArg = (mockRepo.findByName as any).mock.calls[0][0]
      expect(callArg.toString()).toBe('Books')
    })

    it('should throw when a category with the same name already exists', async () => {
      const existing = Category.create({ name: 'Duplicate', description: '' })
      ;(mockRepo.findByName as any).mockResolvedValue(existing)

      await expect(service.createCategory('Duplicate', 'desc')).rejects.toThrow(
        'Category already exists: Duplicate',
      )
      expect(mockRepo.save).not.toHaveBeenCalled()
    })
  })

  describe('ensureNameUnique', () => {
    it('should not throw when the name is unique', async () => {
      await expect(service.ensureNameUnique('Unique Name')).resolves.toBeUndefined()
    })

    it('should throw when the name is taken', async () => {
      const existing = Category.create({ name: 'Taken', description: '' })
      ;(mockRepo.findByName as any).mockResolvedValue(existing)

      await expect(service.ensureNameUnique('Taken')).rejects.toThrow(
        'Category already exists: Taken',
      )
    })
  })
})
