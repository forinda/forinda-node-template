import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Container } from '@/core'
import { DeleteProductUseCase } from './delete-product.use-case'
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

describe('DeleteProductUseCase', () => {
  let useCase: DeleteProductUseCase
  let mockRepo: IProductRepository

  beforeEach(() => {
    Container.reset()
    mockRepo = createMockRepo()
    Container.getInstance().register(DeleteProductUseCase, DeleteProductUseCase)
    Container.getInstance().registerInstance(PRODUCT_REPOSITORY, mockRepo)
    useCase = Container.getInstance().resolve(DeleteProductUseCase)
  })

  it('should delete an existing product', async () => {
    const product = Product.create({
      name: 'Doomed',
      description: '',
      price: 5,
      categoryId: 'cat-1',
      stock: 1,
    })
    ;(mockRepo.findById as any).mockResolvedValue(product)

    await useCase.execute(product.id.toString())

    expect(mockRepo.delete).toHaveBeenCalledTimes(1)
    const deleteArg = (mockRepo.delete as any).mock.calls[0][0]
    expect(deleteArg.toString()).toBe(product.id.toString())
  })

  it('should throw when the product does not exist', async () => {
    ;(mockRepo.findById as any).mockResolvedValue(null)

    await expect(useCase.execute('not-found-id')).rejects.toThrow(
      'Product not found: not-found-id',
    )
    expect(mockRepo.delete).not.toHaveBeenCalled()
  })
})
