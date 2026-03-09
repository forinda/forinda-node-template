import { describe, it, expect, beforeEach } from 'vitest'
import { InMemoryProductRepository } from './in-memory-product.repository'
import { Product } from '../../domain/entities/product.entity'
import { ProductId } from '../../domain/value-objects/product-id.vo'

function createProduct(overrides: Partial<Parameters<typeof Product.create>[0]> = {}) {
  return Product.create({
    name: 'Test Product',
    description: 'A test product',
    price: 10,
    currency: 'USD',
    categoryId: 'cat-1',
    stock: 5,
    ...overrides,
  })
}

describe('InMemoryProductRepository', () => {
  let repo: InMemoryProductRepository

  beforeEach(() => {
    repo = new InMemoryProductRepository()
  })

  describe('save and findById', () => {
    it('should save a product and retrieve it by id', async () => {
      const product = createProduct()
      await repo.save(product)

      const found = await repo.findById(product.id)
      expect(found).toBe(product)
    })

    it('should return null for a non-existent id', async () => {
      const found = await repo.findById(ProductId.from('non-existent'))
      expect(found).toBeNull()
    })

    it('should update an existing product when saved again', async () => {
      const product = createProduct()
      await repo.save(product)

      product.changeName('Updated Name')
      await repo.save(product)

      const found = await repo.findById(product.id)
      expect(found!.name).toBe('Updated Name')

      const all = await repo.findAll()
      expect(all).toHaveLength(1)
    })
  })

  describe('findByCategoryId', () => {
    it('should return products matching the category', async () => {
      const p1 = createProduct({ name: 'P1', categoryId: 'cat-a' })
      const p2 = createProduct({ name: 'P2', categoryId: 'cat-b' })
      const p3 = createProduct({ name: 'P3', categoryId: 'cat-a' })
      await repo.save(p1)
      await repo.save(p2)
      await repo.save(p3)

      const results = await repo.findByCategoryId('cat-a')
      expect(results).toHaveLength(2)
      expect(results.map((p) => p.name)).toContain('P1')
      expect(results.map((p) => p.name)).toContain('P3')
    })

    it('should return empty array when no products match', async () => {
      const p1 = createProduct({ categoryId: 'cat-a' })
      await repo.save(p1)

      const results = await repo.findByCategoryId('cat-nonexistent')
      expect(results).toEqual([])
    })
  })

  describe('findAll', () => {
    it('should return empty array when no products exist', async () => {
      const results = await repo.findAll()
      expect(results).toEqual([])
    })

    it('should return all saved products', async () => {
      await repo.save(createProduct({ name: 'A' }))
      await repo.save(createProduct({ name: 'B' }))

      const results = await repo.findAll()
      expect(results).toHaveLength(2)
    })
  })

  describe('delete', () => {
    it('should remove a product by id', async () => {
      const product = createProduct()
      await repo.save(product)
      await repo.delete(product.id)

      const found = await repo.findById(product.id)
      expect(found).toBeNull()
    })

    it('should not throw when deleting a non-existent product', async () => {
      await expect(repo.delete(ProductId.from('nope'))).resolves.toBeUndefined()
    })
  })
})
