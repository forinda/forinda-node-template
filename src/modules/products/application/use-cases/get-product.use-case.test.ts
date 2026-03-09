import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Container } from '@/core'
import { GetProductUseCase } from './get-product.use-case'
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

describe('GetProductUseCase', () => {
  let useCase: GetProductUseCase
  let mockRepo: IProductRepository

  beforeEach(() => {
    Container.reset()
    mockRepo = createMockRepo()
    Container.getInstance().register(GetProductUseCase, GetProductUseCase)
    Container.getInstance().registerInstance(PRODUCT_REPOSITORY, mockRepo)
    useCase = Container.getInstance().resolve(GetProductUseCase)
  })

  it('should return a product response when found', async () => {
    const product = Product.create({
      name: 'Found',
      description: 'Desc',
      price: 10,
      categoryId: 'cat-1',
      stock: 2,
    })
    ;(mockRepo.findById as any).mockResolvedValue(product)

    const result = await useCase.execute(product.id.toString())

    expect(result).toEqual({
      id: product.id.toString(),
      name: 'Found',
      description: 'Desc',
      price: { amount: 10, currency: 'USD' },
      categoryId: 'cat-1',
      stock: 2,
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    })
  })

  it('should return null when product is not found', async () => {
    ;(mockRepo.findById as any).mockResolvedValue(null)

    const result = await useCase.execute('00000000-0000-0000-0000-000000000000')
    expect(result).toBeNull()
  })

  it('should throw for an invalid (empty) id', async () => {
    await expect(useCase.execute('')).rejects.toThrow('ProductId cannot be empty')
  })
})
