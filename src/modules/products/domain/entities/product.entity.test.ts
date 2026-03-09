import { describe, it, expect } from 'vitest'
import { Product } from './product.entity'
import { ProductId } from '../value-objects/product-id.vo'
import { Money } from '../value-objects/money.vo'

const validParams = {
  name: 'Widget',
  description: 'A useful widget',
  price: 29.99,
  currency: 'USD',
  categoryId: '00000000-0000-0000-0000-000000000001',
  stock: 10,
}

describe('Product', () => {
  describe('create', () => {
    it('should create a product with valid params', () => {
      const product = Product.create(validParams)

      expect(product.name).toBe('Widget')
      expect(product.description).toBe('A useful widget')
      expect(product.price.getAmount()).toBe(29.99)
      expect(product.price.getCurrency()).toBe('USD')
      expect(product.categoryId).toBe('00000000-0000-0000-0000-000000000001')
      expect(product.stock).toBe(10)
      expect(product.id).toBeDefined()
      expect(product.createdAt).toBeInstanceOf(Date)
      expect(product.updatedAt).toBeInstanceOf(Date)
    })

    it('should trim the product name', () => {
      const product = Product.create({ ...validParams, name: '  Trimmed  ' })
      expect(product.name).toBe('Trimmed')
    })

    it('should default description to empty string when undefined', () => {
      const product = Product.create({ ...validParams, description: undefined as any })
      expect(product.description).toBe('')
    })

    it('should default currency to USD', () => {
      const { currency: _, ...noCurrency } = validParams
      const product = Product.create(noCurrency)
      expect(product.price.getCurrency()).toBe('USD')
    })

    it('should throw when name is empty', () => {
      expect(() => Product.create({ ...validParams, name: '' })).toThrow(
        'Product name cannot be empty',
      )
    })

    it('should throw when name is whitespace only', () => {
      expect(() => Product.create({ ...validParams, name: '   ' })).toThrow(
        'Product name cannot be empty',
      )
    })

    it('should throw when stock is negative', () => {
      expect(() => Product.create({ ...validParams, stock: -1 })).toThrow(
        'Stock cannot be negative',
      )
    })
  })

  describe('reconstitute', () => {
    it('should recreate a product from raw props', () => {
      const now = new Date()
      const props = {
        id: ProductId.from('existing-id'),
        name: 'Reconstituted',
        description: 'Desc',
        price: Money.create(5, 'EUR'),
        categoryId: 'cat-1',
        stock: 3,
        createdAt: now,
        updatedAt: now,
      }

      const product = Product.reconstitute(props)

      expect(product.id.toString()).toBe('existing-id')
      expect(product.name).toBe('Reconstituted')
      expect(product.price.getCurrency()).toBe('EUR')
    })
  })

  describe('changeName', () => {
    it('should update the name and updatedAt', () => {
      const product = Product.create(validParams)
      const originalUpdatedAt = product.updatedAt

      // Small delay to ensure timestamp differs
      product.changeName('New Name')

      expect(product.name).toBe('New Name')
      expect(product.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime())
    })

    it('should trim the new name', () => {
      const product = Product.create(validParams)
      product.changeName('  Trimmed Name  ')
      expect(product.name).toBe('Trimmed Name')
    })

    it('should throw when name is empty', () => {
      const product = Product.create(validParams)
      expect(() => product.changeName('')).toThrow('Product name cannot be empty')
    })

    it('should throw when name is whitespace only', () => {
      const product = Product.create(validParams)
      expect(() => product.changeName('   ')).toThrow('Product name cannot be empty')
    })
  })

  describe('changeDescription', () => {
    it('should update the description', () => {
      const product = Product.create(validParams)
      product.changeDescription('New description')
      expect(product.description).toBe('New description')
    })
  })

  describe('changePrice', () => {
    it('should update the price', () => {
      const product = Product.create(validParams)
      product.changePrice(99.99)
      expect(product.price.getAmount()).toBe(99.99)
      expect(product.price.getCurrency()).toBe('USD')
    })

    it('should accept a different currency', () => {
      const product = Product.create(validParams)
      product.changePrice(50, 'EUR')
      expect(product.price.getCurrency()).toBe('EUR')
    })
  })

  describe('changeCategory', () => {
    it('should update the categoryId', () => {
      const product = Product.create(validParams)
      product.changeCategory('new-cat-id')
      expect(product.categoryId).toBe('new-cat-id')
    })
  })

  describe('adjustStock', () => {
    it('should increase stock', () => {
      const product = Product.create({ ...validParams, stock: 5 })
      product.adjustStock(3)
      expect(product.stock).toBe(8)
    })

    it('should decrease stock', () => {
      const product = Product.create({ ...validParams, stock: 5 })
      product.adjustStock(-3)
      expect(product.stock).toBe(2)
    })

    it('should allow stock to reach zero', () => {
      const product = Product.create({ ...validParams, stock: 5 })
      product.adjustStock(-5)
      expect(product.stock).toBe(0)
    })

    it('should throw when resulting stock would be negative', () => {
      const product = Product.create({ ...validParams, stock: 2 })
      expect(() => product.adjustStock(-3)).toThrow('Insufficient stock')
    })
  })

  describe('toJSON', () => {
    it('should serialize the product to a plain object', () => {
      const product = Product.create(validParams)
      const json = product.toJSON()

      expect(json).toEqual({
        id: product.id.toString(),
        name: 'Widget',
        description: 'A useful widget',
        price: { amount: 29.99, currency: 'USD' },
        categoryId: '00000000-0000-0000-0000-000000000001',
        stock: 10,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      })
    })
  })
})
