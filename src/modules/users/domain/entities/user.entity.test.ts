import { describe, it, expect } from 'vitest'
import { User } from './user.entity'
import { UserId } from '../value-objects/user-id.vo'
import { Email } from '../value-objects/email.vo'

describe('User', () => {
  describe('create', () => {
    it('should create a user with auto-generated id and timestamps', () => {
      const user = User.create({ name: 'Alice', email: 'alice@example.com' })

      expect(user.name).toBe('Alice')
      expect(user.email.toString()).toBe('alice@example.com')
      expect(user.id.toString()).toBeTruthy()
      expect(user.createdAt).toBeInstanceOf(Date)
      expect(user.updatedAt).toBeInstanceOf(Date)
    })

    it('should throw for an invalid email', () => {
      expect(() => User.create({ name: 'Alice', email: 'not-an-email' })).toThrow('Invalid email')
    })
  })

  describe('reconstitute', () => {
    it('should reconstitute a user from existing props', () => {
      const id = UserId.from('test-id-123')
      const email = Email.create('bob@example.com')
      const createdAt = new Date('2025-01-01')
      const updatedAt = new Date('2025-06-01')

      const user = User.reconstitute({ id, name: 'Bob', email, createdAt, updatedAt })

      expect(user.id.toString()).toBe('test-id-123')
      expect(user.name).toBe('Bob')
      expect(user.email.toString()).toBe('bob@example.com')
      expect(user.createdAt).toBe(createdAt)
      expect(user.updatedAt).toBe(updatedAt)
    })
  })

  describe('changeName', () => {
    it('should update the name and updatedAt', () => {
      const user = User.create({ name: 'Alice', email: 'alice@example.com' })
      const originalUpdatedAt = user.updatedAt

      // Small delay to ensure timestamp difference
      user.changeName('Alice Smith')

      expect(user.name).toBe('Alice Smith')
      expect(user.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime())
    })

    it('should trim the new name', () => {
      const user = User.create({ name: 'Alice', email: 'alice@example.com' })
      user.changeName('  Bob  ')
      expect(user.name).toBe('Bob')
    })

    it('should throw for an empty name', () => {
      const user = User.create({ name: 'Alice', email: 'alice@example.com' })
      expect(() => user.changeName('')).toThrow('Name cannot be empty')
    })

    it('should throw for a whitespace-only name', () => {
      const user = User.create({ name: 'Alice', email: 'alice@example.com' })
      expect(() => user.changeName('   ')).toThrow('Name cannot be empty')
    })
  })

  describe('changeEmail', () => {
    it('should update the email and updatedAt', () => {
      const user = User.create({ name: 'Alice', email: 'alice@example.com' })
      user.changeEmail('newalice@example.com')

      expect(user.email.toString()).toBe('newalice@example.com')
    })

    it('should throw for an invalid email', () => {
      const user = User.create({ name: 'Alice', email: 'alice@example.com' })
      expect(() => user.changeEmail('bad-email')).toThrow('Invalid email')
    })
  })

  describe('toJSON', () => {
    it('should return a plain object with string representations', () => {
      const user = User.create({ name: 'Alice', email: 'alice@example.com' })
      const json = user.toJSON()

      expect(json).toEqual({
        id: user.id.toString(),
        name: 'Alice',
        email: 'alice@example.com',
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      })
    })
  })
})
