import { describe, it, expect, beforeEach } from 'vitest'
import { InMemoryUserRepository } from './in-memory-user.repository'
import { User } from '../../domain/entities/user.entity'
import { UserId } from '../../domain/value-objects/user-id.vo'
import { Email } from '../../domain/value-objects/email.vo'

describe('InMemoryUserRepository', () => {
  let repo: InMemoryUserRepository

  beforeEach(() => {
    repo = new InMemoryUserRepository()
  })

  describe('save and findById', () => {
    it('should save a user and retrieve it by id', async () => {
      const user = User.create({ name: 'Alice', email: 'alice@example.com' })
      await repo.save(user)

      const found = await repo.findById(user.id)
      expect(found).not.toBeNull()
      expect(found!.name).toBe('Alice')
      expect(found!.email.toString()).toBe('alice@example.com')
    })

    it('should return null for a non-existent id', async () => {
      const found = await repo.findById(UserId.from('non-existent'))
      expect(found).toBeNull()
    })
  })

  describe('findByEmail', () => {
    it('should find a user by email', async () => {
      const user = User.create({ name: 'Bob', email: 'bob@example.com' })
      await repo.save(user)

      const found = await repo.findByEmail(Email.create('bob@example.com'))
      expect(found).not.toBeNull()
      expect(found!.name).toBe('Bob')
    })

    it('should return null when no user matches the email', async () => {
      const found = await repo.findByEmail(Email.create('nobody@example.com'))
      expect(found).toBeNull()
    })
  })

  describe('findAll', () => {
    it('should return an empty array when no users exist', async () => {
      const users = await repo.findAll()
      expect(users).toEqual([])
    })

    it('should return all saved users', async () => {
      const user1 = User.create({ name: 'Alice', email: 'alice@example.com' })
      const user2 = User.create({ name: 'Bob', email: 'bob@example.com' })
      await repo.save(user1)
      await repo.save(user2)

      const users = await repo.findAll()
      expect(users).toHaveLength(2)
    })
  })

  describe('delete', () => {
    it('should remove a user by id', async () => {
      const user = User.create({ name: 'Alice', email: 'alice@example.com' })
      await repo.save(user)
      await repo.delete(user.id)

      const found = await repo.findById(user.id)
      expect(found).toBeNull()
    })

    it('should not throw when deleting a non-existent user', async () => {
      await expect(repo.delete(UserId.from('non-existent'))).resolves.toBeUndefined()
    })
  })

  describe('update (save existing)', () => {
    it('should overwrite an existing user when saved again', async () => {
      const user = User.create({ name: 'Alice', email: 'alice@example.com' })
      await repo.save(user)

      user.changeName('Alice Updated')
      await repo.save(user)

      const found = await repo.findById(user.id)
      expect(found!.name).toBe('Alice Updated')

      const all = await repo.findAll()
      expect(all).toHaveLength(1)
    })
  })
})
