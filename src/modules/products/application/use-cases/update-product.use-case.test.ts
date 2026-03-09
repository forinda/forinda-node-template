import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Container } from '@/core'
import { UpdateProductUseCase } from './update-product.use-case'
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

describe('UpdateProductUseCase', () => {
  let useCase: UpdateProductUseCase
  let mockRepo: IProductRepository

  beforeEach(() => {
    Container.reset()
    mockRepo = createMockRepo()
    Container.getInstance().register(UpdateProductUseCase, UpdateProductUseCase)
    Container.getInstance().registerInstance(PRODUCT_REPOSITORY, mockRepo)
    useCase = Container.getInstance().resolve(UpdateProductUseCase)
  })

  it('should update product name', async () => {
    const product = Product.create({
      name: 'Old',
      description: 'Desc',
      price: 10,
      categoryId: 'cat-1',
      stock: 5,
    })
    ;(mockRepo.findById as any).mockResolvedValue(product)

    const result = await useCase.execute(product.id.toString(), { name: 'New' })

    expect(result.name).toBe('New')
    expect(mockRepo.save).toHaveBeenCalled()
  })

  it('should update product description', async () => {
    const product = Product.create({
      name: 'P',
      description: 'Old desc',
      price: 10,
      categoryId: 'cat-1',
      stock: 5,
    })
    ;(mockRepo.findById as any).mockResolvedValue(product)

    const result = await useCase.execute(product.id.toString(), { description: 'New desc' })

    expect(result.description).toBe('New desc')
  })

  it('should update product price', async () => {
    const product = Product.create({
      name: 'P',
      description: '',
      price: 10,
      categoryId: 'cat-1',
      stock: 5,
    })
    ;(mockRepo.findById as any).mockResolvedValue(product)

    const result = await useCase.execute(product.id.toString(), { price: 25.5, currency: 'EUR' })

    expect(result.price).toEqual({ amount: 25.5, currency: 'EUR' })
  })

  it('should update product category', async () => {
    const product = Product.create({
      name: 'P',
      description: '',
      price: 10,
      categoryId: 'cat-1',
      stock: 5,
    })
    ;(mockRepo.findById as any).mockResolvedValue(product)

    const result = await useCase.execute(product.id.toString(), { categoryId: 'cat-2' })

    expect(result.categoryId).toBe('cat-2')
  })

  it('should update stock via adjustStock', async () => {
    const product = Product.create({
      name: 'P',
      description: '',
      price: 10,
      categoryId: 'cat-1',
      stock: 5,
    })
    ;(mockRepo.findById as any).mockResolvedValue(product)

    const result = await useCase.execute(product.id.toString(), { stock: 8 })

    expect(result.stock).toBe(8)
  })

  it('should throw when product is not found', async () => {
    ;(mockRepo.findById as any).mockResolvedValue(null)

    await expect(useCase.execute('missing-id', { name: 'X' })).rejects.toThrow(
      'Product not found: missing-id',
    )
  })
})
