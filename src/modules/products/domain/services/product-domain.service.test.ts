import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ProductDomainService } from './product-domain.service'
import type { IProductRepository } from '../repositories/product.repository'
import type { ICategoryRepository } from '@/modules/categories/domain/repositories/category.repository'
import { Category } from '@/modules/categories/domain/entities/category.entity'
import { Product } from '../entities/product.entity'

function createMockProductRepo(): IProductRepository {
  return {
    findById: vi.fn().mockResolvedValue(null),
    findByCategoryId: vi.fn().mockResolvedValue([]),
    findAll: vi.fn().mockResolvedValue([]),
    save: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
  }
}

function createMockCategoryRepo(): ICategoryRepository {
  return {
    findById: vi.fn().mockResolvedValue(null),
    findByName: vi.fn().mockResolvedValue(null),
    findAll: vi.fn().mockResolvedValue([]),
    save: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
  }
}

describe('ProductDomainService', () => {
  let service: ProductDomainService
  let mockProductRepo: IProductRepository
  let mockCategoryRepo: ICategoryRepository

  beforeEach(() => {
    mockProductRepo = createMockProductRepo()
    mockCategoryRepo = createMockCategoryRepo()
    // Bypass DI: construct directly with mock repos
    service = new (ProductDomainService as any)(mockProductRepo, mockCategoryRepo)
  })

  describe('createProduct', () => {
    const params = {
      name: 'Widget',
      description: 'A widget',
      price: 19.99,
      currency: 'USD',
      categoryId: '00000000-0000-0000-0000-000000000001',
      stock: 10,
    }

    it('should create and save a product when the category exists', async () => {
      const category = Category.create({ name: 'Electronics', description: 'Devices' })
      ;(mockCategoryRepo.findById as any).mockResolvedValue(category)

      const result = await service.createProduct(params)

      expect(result).toBeInstanceOf(Product)
      expect(result.name).toBe('Widget')
      expect(result.price.getAmount()).toBe(19.99)
      expect(result.stock).toBe(10)
      expect(mockProductRepo.save).toHaveBeenCalledWith(result)
    })

    it('should validate that the category exists', async () => {
      const category = Category.create({ name: 'Books', description: '' })
      ;(mockCategoryRepo.findById as any).mockResolvedValue(category)

      await service.createProduct(params)

      expect(mockCategoryRepo.findById).toHaveBeenCalledTimes(1)
      const callArg = (mockCategoryRepo.findById as any).mock.calls[0][0]
      expect(callArg.toString()).toBe(params.categoryId)
    })

    it('should throw when the category does not exist', async () => {
      ;(mockCategoryRepo.findById as any).mockResolvedValue(null)

      await expect(service.createProduct(params)).rejects.toThrow(
        `Category not found: ${params.categoryId}`,
      )
      expect(mockProductRepo.save).not.toHaveBeenCalled()
    })
  })
})
