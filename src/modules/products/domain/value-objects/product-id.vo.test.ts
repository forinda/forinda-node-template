import { describe, it, expect } from 'vitest'
import { ProductId } from './product-id.vo'

describe('ProductId', () => {
  describe('create', () => {
    it('should auto-generate a UUID', () => {
      const id = ProductId.create()
      expect(id.toString()).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      )
    })

    it('should generate unique ids', () => {
      const id1 = ProductId.create()
      const id2 = ProductId.create()
      expect(id1.toString()).not.toBe(id2.toString())
    })
  })

  describe('from', () => {
    it('should create a ProductId from a valid string', () => {
      const id = ProductId.from('abc-123')
      expect(id.toString()).toBe('abc-123')
    })

    it('should throw when given an empty string', () => {
      expect(() => ProductId.from('')).toThrow('ProductId cannot be empty')
    })

    it('should throw when given a whitespace-only string', () => {
      expect(() => ProductId.from('   ')).toThrow('ProductId cannot be empty')
    })
  })

  describe('equals', () => {
    it('should return true for ids with the same value', () => {
      const id1 = ProductId.from('same-value')
      const id2 = ProductId.from('same-value')
      expect(id1.equals(id2)).toBe(true)
    })

    it('should return false for ids with different values', () => {
      const id1 = ProductId.from('value-a')
      const id2 = ProductId.from('value-b')
      expect(id1.equals(id2)).toBe(false)
    })
  })

  describe('toString', () => {
    it('should return the underlying string value', () => {
      const id = ProductId.from('my-id')
      expect(id.toString()).toBe('my-id')
    })
  })
})
