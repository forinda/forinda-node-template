import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreateProductUseCase } from './create-product.use-case'
import { ProductDomainService } from '../../domain/services/product-domain.service'
import { Product } from '../../domain/entities/product.entity'

describe('CreateProductUseCase', () => {
  let useCase: CreateProductUseCase
  let mockDomainService: ProductDomainService

  beforeEach(() => {
    mockDomainService = {
      createProduct: vi.fn(),
    } as unknown as ProductDomainService

    useCase = new (CreateProductUseCase as any)(mockDomainService)
  })

  it('should delegate to domain service and return a response DTO', async () => {
    const product = Product.create({
      name: 'Widget',
      description: 'Nice widget',
      price: 15,
      currency: 'USD',
      categoryId: 'cat-1',
      stock: 5,
    })
    ;(mockDomainService.createProduct as any).mockResolvedValue(product)

    const dto = {
      name: 'Widget',
      description: 'Nice widget',
      price: 15,
      currency: 'USD',
      categoryId: 'cat-1',
      stock: 5,
    }

    const result = await useCase.execute(dto)

    expect(mockDomainService.createProduct).toHaveBeenCalledWith(dto)
    expect(result).toEqual({
      id: product.id.toString(),
      name: 'Widget',
      description: 'Nice widget',
      price: { amount: 15, currency: 'USD' },
      categoryId: 'cat-1',
      stock: 5,
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    })
  })

  it('should propagate errors from the domain service', async () => {
    ;(mockDomainService.createProduct as any).mockRejectedValue(
      new Error('Category not found: bad-id'),
    )

    await expect(
      useCase.execute({
        name: 'X',
        description: '',
        price: 10,
        currency: 'USD',
        categoryId: 'bad-id',
        stock: 1,
      }),
    ).rejects.toThrow('Category not found: bad-id')
  })
})
