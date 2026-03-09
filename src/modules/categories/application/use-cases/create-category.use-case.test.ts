import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreateCategoryUseCase } from './create-category.use-case'
import { CategoryDomainService } from '../../domain/services/category-domain.service'
import { Category } from '../../domain/entities/category.entity'

describe('CreateCategoryUseCase', () => {
  let useCase: CreateCategoryUseCase
  let mockDomainService: CategoryDomainService

  beforeEach(() => {
    mockDomainService = {
      createCategory: vi.fn(),
      ensureNameUnique: vi.fn(),
    } as unknown as CategoryDomainService

    useCase = new (CreateCategoryUseCase as any)(mockDomainService)
  })

  it('should delegate to domain service and return a DTO', async () => {
    const category = Category.create({ name: 'Electronics', description: 'Devices' })
    ;(mockDomainService.createCategory as any).mockResolvedValue(category)

    const result = await useCase.execute({ name: 'Electronics', description: 'Devices' })

    expect(mockDomainService.createCategory).toHaveBeenCalledWith('Electronics', 'Devices')
    expect(result).toEqual({
      id: category.id.toString(),
      name: 'Electronics',
      description: 'Devices',
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    })
  })

  it('should propagate errors from domain service', async () => {
    ;(mockDomainService.createCategory as any).mockRejectedValue(
      new Error('Category already exists: Dup'),
    )

    await expect(useCase.execute({ name: 'Dup', description: '' })).rejects.toThrow(
      'Category already exists: Dup',
    )
  })
})
