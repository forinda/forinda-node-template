import { describe, it, expect } from 'vitest'
import { Money } from './money.vo'

describe('Money', () => {
  describe('create', () => {
    it('should create money with amount and default currency USD', () => {
      const money = Money.create(10.5)
      expect(money.getAmount()).toBe(10.5)
      expect(money.getCurrency()).toBe('USD')
    })

    it('should create money with a specified currency', () => {
      const money = Money.create(25, 'EUR')
      expect(money.getCurrency()).toBe('EUR')
    })

    it('should uppercase the currency code', () => {
      const money = Money.create(5, 'gbp')
      expect(money.getCurrency()).toBe('GBP')
    })

    it('should round to two decimal places', () => {
      const money = Money.create(10.999)
      expect(money.getAmount()).toBe(11)
    })

    it('should round 10.555 correctly', () => {
      const money = Money.create(10.555)
      expect(money.getAmount()).toBe(10.56)
    })

    it('should allow zero amount', () => {
      const money = Money.create(0)
      expect(money.getAmount()).toBe(0)
    })

    it('should throw for negative amounts', () => {
      expect(() => Money.create(-1)).toThrow('Price cannot be negative')
    })

    it('should throw for currency with wrong length', () => {
      expect(() => Money.create(10, 'US')).toThrow('Currency must be a 3-letter code')
      expect(() => Money.create(10, 'USDD')).toThrow('Currency must be a 3-letter code')
    })

    it('should throw for empty currency', () => {
      expect(() => Money.create(10, '')).toThrow('Currency must be a 3-letter code')
    })
  })

  describe('add', () => {
    it('should add two money values with the same currency', () => {
      const a = Money.create(10.5, 'USD')
      const b = Money.create(5.25, 'USD')
      const result = a.add(b)
      expect(result.getAmount()).toBe(15.75)
      expect(result.getCurrency()).toBe('USD')
    })

    it('should throw when adding different currencies', () => {
      const usd = Money.create(10, 'USD')
      const eur = Money.create(5, 'EUR')
      expect(() => usd.add(eur)).toThrow('Cannot add different currencies')
    })
  })

  describe('equals', () => {
    it('should return true for same amount and currency', () => {
      const a = Money.create(10, 'USD')
      const b = Money.create(10, 'USD')
      expect(a.equals(b)).toBe(true)
    })

    it('should return false for different amounts', () => {
      const a = Money.create(10, 'USD')
      const b = Money.create(20, 'USD')
      expect(a.equals(b)).toBe(false)
    })

    it('should return false for different currencies', () => {
      const a = Money.create(10, 'USD')
      const b = Money.create(10, 'EUR')
      expect(a.equals(b)).toBe(false)
    })
  })

  describe('toString', () => {
    it('should format as "amount currency"', () => {
      const money = Money.create(19.99, 'USD')
      expect(money.toString()).toBe('19.99 USD')
    })

    it('should show two decimal places for whole numbers', () => {
      const money = Money.create(5, 'GBP')
      expect(money.toString()).toBe('5.00 GBP')
    })
  })

  describe('toJSON', () => {
    it('should return amount and currency as a plain object', () => {
      const money = Money.create(42.5, 'EUR')
      expect(money.toJSON()).toEqual({ amount: 42.5, currency: 'EUR' })
    })
  })
})
