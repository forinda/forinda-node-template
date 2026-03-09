import { describe, it, expect } from 'vitest'
import { Email } from './email.vo'

describe('Email', () => {
  describe('create', () => {
    it('should create an Email from a valid address', () => {
      const email = Email.create('user@example.com')
      expect(email.toString()).toBe('user@example.com')
    })

    it('should lowercase the email', () => {
      const email = Email.create('User@EXAMPLE.COM')
      expect(email.toString()).toBe('user@example.com')
    })

    it('should reject email with leading/trailing whitespace (validated before trim)', () => {
      // The regex rejects whitespace characters, so untrimmed emails are invalid
      expect(() => Email.create('  user@example.com  ')).toThrow('Invalid email')
    })

    it('should throw for email missing @', () => {
      expect(() => Email.create('userexample.com')).toThrow('Invalid email')
    })

    it('should throw for email missing domain', () => {
      expect(() => Email.create('user@')).toThrow('Invalid email')
    })

    it('should throw for email missing local part', () => {
      expect(() => Email.create('@example.com')).toThrow('Invalid email')
    })

    it('should throw for email with spaces in the middle', () => {
      expect(() => Email.create('us er@example.com')).toThrow('Invalid email')
    })

    it('should throw for an empty string', () => {
      expect(() => Email.create('')).toThrow('Invalid email')
    })

    it('should throw for email missing TLD', () => {
      expect(() => Email.create('user@example')).toThrow('Invalid email')
    })
  })

  describe('equals', () => {
    it('should return true for emails with the same normalized value', () => {
      const a = Email.create('User@Example.COM')
      const b = Email.create('user@example.com')
      expect(a.equals(b)).toBe(true)
    })

    it('should return false for different emails', () => {
      const a = Email.create('alice@example.com')
      const b = Email.create('bob@example.com')
      expect(a.equals(b)).toBe(false)
    })
  })

  describe('toString', () => {
    it('should return the normalized email string', () => {
      const email = Email.create('Test@Domain.Org')
      expect(email.toString()).toBe('test@domain.org')
    })
  })
})
