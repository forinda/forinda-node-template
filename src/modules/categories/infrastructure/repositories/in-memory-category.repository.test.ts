import { describe, it, expect, beforeEach } from 'vitest'
import { InMemoryCategoryRepository } from './in-memory-category.repository'
import { Category } from '../../domain/entities/category.entity'
import { CategoryId } from '../../domain/value-objects/category-id.vo'
import { CategoryName } from '../../domain/value-objects/category-name.vo'

describe('InMemoryCategoryRepository', () => {
  let repo: InMemoryCategoryRepository

  beforeEach(() => {
    repo = new InMemoryCategoryRepository()
  })

  describe('save and findById', () => {
    it('should save a category and retrieve it by id', async () => {
      const category = Category.create({ name: 'Electronics', description: 'Gadgets' })
      await repo.save(category)

      const found = await repo.findById(category.id)
      expect(found).not.toBeNull()
      expect(found!.id.toString()).toBe(category.id.toString())
      expect(found!.name.toString()).toBe('Electronics')
    })

    it('should return null for a non-existent id', async () => {
      const found = await repo.findById(CategoryId.from('non-existent'))
      expect(found).toBeNull()
    })
  })

  describe('save (update)', () => {
    it('should overwrite an existing category when saved again', async () => {
      const category = Category.create({ name: 'Original', description: 'Desc' })
      await repo.save(category)

      category.changeName('Updated')
      await repo.save(category)

      const found = await repo.findById(category.id)
      expect(found!.name.toString()).toBe('Updated')

      const all = await repo.findAll()
      expect(all).toHaveLength(1)
    })
  })

  describe('findByName', () => {
    it('should find a category by its name', async () => {
      const category = Category.create({ name: 'Books', description: '' })
      await repo.save(category)

      const found = await repo.findByName(CategoryName.create('Books'))
      expect(found).not.toBeNull()
      expect(found!.id.toString()).toBe(category.id.toString())
    })

    it('should return null when no category has the given name', async () => {
      const found = await repo.findByName(CategoryName.create('Nonexistent'))
      expect(found).toBeNull()
    })
  })

  describe('findAll', () => {
    it('should return an empty array when no categories exist', async () => {
      const all = await repo.findAll()
      expect(all).toEqual([])
    })

    it('should return all saved categories', async () => {
      await repo.save(Category.create({ name: 'Cat A', description: '' }))
      await repo.save(Category.create({ name: 'Cat B', description: '' }))
      await repo.save(Category.create({ name: 'Cat C', description: '' }))

      const all = await repo.findAll()
      expect(all).toHaveLength(3)
    })
  })

  describe('delete', () => {
    it('should remove a category by id', async () => {
      const category = Category.create({ name: 'ToDelete', description: '' })
      await repo.save(category)

      await repo.delete(category.id)

      const found = await repo.findById(category.id)
      expect(found).toBeNull()
    })

    it('should not throw when deleting a non-existent id', async () => {
      await expect(repo.delete(CategoryId.from('no-such-id'))).resolves.toBeUndefined()
    })

    it('should only delete the specified category', async () => {
      const a = Category.create({ name: 'Keep', description: '' })
      const b = Category.create({ name: 'Remove', description: '' })
      await repo.save(a)
      await repo.save(b)

      await repo.delete(b.id)

      const all = await repo.findAll()
      expect(all).toHaveLength(1)
      expect(all[0].name.toString()).toBe('Keep')
    })
  })
})
