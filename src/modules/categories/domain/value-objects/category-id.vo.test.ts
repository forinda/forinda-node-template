import { describe, it, expect } from 'vitest'
import { CategoryId } from './category-id.vo'

describe('CategoryId', () => {
  describe('create', () => {
    it('should generate a valid UUID', () => {
      const id = CategoryId.create()
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      expect(id.toString()).toMatch(uuidRegex)
    })

    it('should generate unique IDs on each call', () => {
      const id1 = CategoryId.create()
      const id2 = CategoryId.create()
      expect(id1.toString()).not.toBe(id2.toString())
    })
  })

  describe('from', () => {
    it('should create a CategoryId from a valid string', () => {
      const raw = 'abc-123-def'
      const id = CategoryId.from(raw)
      expect(id.toString()).toBe(raw)
    })

    it('should throw when given an empty string', () => {
      expect(() => CategoryId.from('')).toThrow('CategoryId cannot be empty')
    })

    it('should throw when given a whitespace-only string', () => {
      expect(() => CategoryId.from('   ')).toThrow('CategoryId cannot be empty')
    })
  })

  describe('equals', () => {
    it('should return true for IDs with the same value', () => {
      const id1 = CategoryId.from('same-id')
      const id2 = CategoryId.from('same-id')
      expect(id1.equals(id2)).toBe(true)
    })

    it('should return false for IDs with different values', () => {
      const id1 = CategoryId.from('id-1')
      const id2 = CategoryId.from('id-2')
      expect(id1.equals(id2)).toBe(false)
    })
  })

  describe('toString', () => {
    it('should return the underlying string value', () => {
      const raw = 'my-category-id'
      const id = CategoryId.from(raw)
      expect(id.toString()).toBe(raw)
    })
  })
})
