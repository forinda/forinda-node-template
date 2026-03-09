import { describe, it, expect } from 'vitest'
import { CategoryName } from './category-name.vo'

describe('CategoryName', () => {
  describe('create', () => {
    it('should create a name with a valid string', () => {
      const name = CategoryName.create('Electronics')
      expect(name.toString()).toBe('Electronics')
    })

    it('should trim whitespace from the name', () => {
      const name = CategoryName.create('  Books  ')
      expect(name.toString()).toBe('Books')
    })

    it('should accept a name with exactly 2 characters', () => {
      const name = CategoryName.create('AB')
      expect(name.toString()).toBe('AB')
    })

    it('should accept a name with exactly 100 characters', () => {
      const longName = 'a'.repeat(100)
      const name = CategoryName.create(longName)
      expect(name.toString()).toBe(longName)
    })
  })

  describe('validation', () => {
    it('should throw for a name shorter than 2 characters', () => {
      expect(() => CategoryName.create('A')).toThrow(
        'Category name must be at least 2 characters',
      )
    })

    it('should throw for an empty string', () => {
      expect(() => CategoryName.create('')).toThrow(
        'Category name must be at least 2 characters',
      )
    })

    it('should throw for a whitespace-only string that trims to less than 2 chars', () => {
      expect(() => CategoryName.create('  a  ')).toThrow(
        'Category name must be at least 2 characters',
      )
    })

    it('should throw for a name longer than 100 characters', () => {
      const tooLong = 'a'.repeat(101)
      expect(() => CategoryName.create(tooLong)).toThrow(
        'Category name must be at most 100 characters',
      )
    })

    it('should throw for null/undefined input', () => {
      expect(() => CategoryName.create(null as any)).toThrow()
      expect(() => CategoryName.create(undefined as any)).toThrow()
    })
  })

  describe('equals', () => {
    it('should return true for names with the same value', () => {
      const a = CategoryName.create('Books')
      const b = CategoryName.create('Books')
      expect(a.equals(b)).toBe(true)
    })

    it('should return false for names with different values', () => {
      const a = CategoryName.create('Books')
      const b = CategoryName.create('Music')
      expect(a.equals(b)).toBe(false)
    })

    it('should treat trimmed equivalents as equal', () => {
      const a = CategoryName.create('  Books  ')
      const b = CategoryName.create('Books')
      expect(a.equals(b)).toBe(true)
    })
  })

  describe('toString', () => {
    it('should return the string value of the name', () => {
      const name = CategoryName.create('Clothing')
      expect(name.toString()).toBe('Clothing')
    })
  })
})
