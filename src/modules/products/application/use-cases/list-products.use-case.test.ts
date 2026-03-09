import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Container } from '@/core'
import { ListProductsUseCase } from './list-products.use-case'
import {
  type IProductRepository,
  PRODUCT_REPOSITORY,
} from '../../domain/repositories/product.repository'
import { Product } from '../../domain/entities/product.entity'

function createMockRepo(): IProductRepository {
  return {
    findById: vi.fn().mockResolvedValue(null),
    findByCategoryId: vi.fn().mockResolvedValue([]),
    findAll: vi.fn().mockResolvedValue([]),
    save: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
  }
}

describe('ListProductsUseCase', () => {
  let useCase: ListProductsUseCase
  let mockRepo: IProductRepository

  beforeEach(() => {
    Container.reset()
    mockRepo = createMockRepo()
    Container.getInstance().register(ListProductsUseCase, ListProductsUseCase)
    Container.getInstance().registerInstance(PRODUCT_REPOSITORY, mockRepo)
    useCase = Container.getInstance().resolve(ListProductsUseCase)
  })

  it('should return all products when no categoryId is given', async () => {
    const products = [
      Product.create({ name: 'A', description: '', price: 1, categoryId: 'c1', stock: 1 }),
      Product.create({ name: 'B', description: '', price: 2, categoryId: 'c2', stock: 2 }),
    ]
    ;(mockRepo.findAll as any).mockResolvedValue(products)

    const result = await useCase.execute()

    expect(mockRepo.findAll).toHaveBeenCalled()
    expect(mockRepo.findByCategoryId).not.toHaveBeenCalled()
    expect(result).toHaveLength(2)
    expect(result[0].name).toBe('A')
    expect(result[1].name).toBe('B')
  })

  it('should filter by categoryId when provided', async () => {
    const products = [
      Product.create({ name: 'Filtered', description: '', price: 5, categoryId: 'cat-x', stock: 1 }),
    ]
    ;(mockRepo.findByCategoryId as any).mockResolvedValue(products)

    const result = await useCase.execute('cat-x')

    expect(mockRepo.findByCategoryId).toHaveBeenCalledWith('cat-x')
    expect(mockRepo.findAll).not.toHaveBeenCalled()
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Filtered')
  })

  it('should return empty array when no products exist', async () => {
    ;(mockRepo.findAll as any).mockResolvedValue([])

    const result = await useCase.execute()
    expect(result).toEqual([])
  })
})
