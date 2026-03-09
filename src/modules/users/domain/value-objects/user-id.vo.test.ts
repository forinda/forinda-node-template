import { describe, it, expect } from 'vitest'
import { UserId } from './user-id.vo'

describe('UserId', () => {
  describe('create', () => {
    it('should auto-generate a valid UUID', () => {
      const id = UserId.create()
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      expect(id.toString()).toMatch(uuidRegex)
    })

    it('should generate unique IDs each time', () => {
      const id1 = UserId.create()
      const id2 = UserId.create()
      expect(id1.toString()).not.toBe(id2.toString())
    })
  })

  describe('from', () => {
    it('should create a UserId from a valid string', () => {
      const raw = '550e8400-e29b-41d4-a716-446655440000'
      const id = UserId.from(raw)
      expect(id.toString()).toBe(raw)
    })

    it('should throw when given an empty string', () => {
      expect(() => UserId.from('')).toThrow('UserId cannot be empty')
    })

    it('should throw when given a whitespace-only string', () => {
      expect(() => UserId.from('   ')).toThrow('UserId cannot be empty')
    })
  })

  describe('equals', () => {
    it('should return true for UserIds with the same value', () => {
      const raw = '550e8400-e29b-41d4-a716-446655440000'
      const id1 = UserId.from(raw)
      const id2 = UserId.from(raw)
      expect(id1.equals(id2)).toBe(true)
    })

    it('should return false for UserIds with different values', () => {
      const id1 = UserId.create()
      const id2 = UserId.create()
      expect(id1.equals(id2)).toBe(false)
    })
  })

  describe('toString', () => {
    it('should return the underlying string value', () => {
      const raw = 'my-custom-id'
      const id = UserId.from(raw)
      expect(id.toString()).toBe('my-custom-id')
    })
  })
})
