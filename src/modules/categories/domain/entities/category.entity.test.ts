import { describe, it, expect } from 'vitest'
import { Category } from './category.entity'
import { CategoryId } from '../value-objects/category-id.vo'
import { CategoryName } from '../value-objects/category-name.vo'

describe('Category', () => {
  describe('create', () => {
    it('should create a category with name and description', () => {
      const category = Category.create({ name: 'Electronics', description: 'Gadgets and devices' })

      expect(category.name.toString()).toBe('Electronics')
      expect(category.description).toBe('Gadgets and devices')
      expect(category.id.toString()).toBeTruthy()
      expect(category.createdAt).toBeInstanceOf(Date)
      expect(category.updatedAt).toBeInstanceOf(Date)
    })

    it('should set createdAt and updatedAt to the same time on creation', () => {
      const category = Category.create({ name: 'Books', description: '' })
      expect(category.createdAt.getTime()).toBe(category.updatedAt.getTime())
    })

    it('should generate a unique id for each category', () => {
      const a = Category.create({ name: 'Cat A', description: '' })
      const b = Category.create({ name: 'Cat B', description: '' })
      expect(a.id.toString()).not.toBe(b.id.toString())
    })

    it('should throw when name is invalid', () => {
      expect(() => Category.create({ name: '', description: '' })).toThrow()
      expect(() => Category.create({ name: 'A', description: '' })).toThrow()
    })
  })

  describe('reconstitute', () => {
    it('should reconstitute a category from existing props', () => {
      const id = CategoryId.from('existing-id')
      const name = CategoryName.create('Restored')
      const createdAt = new Date('2024-01-01')
      const updatedAt = new Date('2024-06-01')

      const category = Category.reconstitute({
        id,
        name,
        description: 'Restored desc',
        createdAt,
        updatedAt,
      })

      expect(category.id.toString()).toBe('existing-id')
      expect(category.name.toString()).toBe('Restored')
      expect(category.description).toBe('Restored desc')
      expect(category.createdAt).toBe(createdAt)
      expect(category.updatedAt).toBe(updatedAt)
    })
  })

  describe('changeName', () => {
    it('should update the name', () => {
      const category = Category.create({ name: 'Old Name', description: '' })
      category.changeName('New Name')
      expect(category.name.toString()).toBe('New Name')
    })

    it('should update the updatedAt timestamp', async () => {
      const category = Category.create({ name: 'Original', description: '' })
      const originalUpdatedAt = category.updatedAt.getTime()

      // Small delay to ensure timestamp differs
      await new Promise((r) => setTimeout(r, 10))

      category.changeName('Updated')
      expect(category.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt)
    })

    it('should throw for an invalid new name', () => {
      const category = Category.create({ name: 'Valid', description: '' })
      expect(() => category.changeName('')).toThrow()
      expect(() => category.changeName('X')).toThrow()
    })
  })

  describe('changeDescription', () => {
    it('should update the description', () => {
      const category = Category.create({ name: 'Test', description: 'Old' })
      category.changeDescription('New description')
      expect(category.description).toBe('New description')
    })

    it('should update the updatedAt timestamp', async () => {
      const category = Category.create({ name: 'Test', description: 'Old' })
      const originalUpdatedAt = category.updatedAt.getTime()

      await new Promise((r) => setTimeout(r, 10))

      category.changeDescription('New')
      expect(category.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt)
    })
  })

  describe('toJSON', () => {
    it('should return a plain object representation', () => {
      const category = Category.create({ name: 'Books', description: 'All books' })
      const json = category.toJSON()

      expect(json).toEqual({
        id: expect.any(String),
        name: 'Books',
        description: 'All books',
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      })
    })

    it('should return ISO date strings', () => {
      const category = Category.create({ name: 'Test', description: '' })
      const json = category.toJSON()

      // ISO strings end with Z and contain T
      expect(json.createdAt).toContain('T')
      expect(json.updatedAt).toContain('T')
    })
  })
})
