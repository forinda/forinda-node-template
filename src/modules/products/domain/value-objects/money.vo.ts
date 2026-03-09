export class Money {
  private constructor(
    private readonly amount: number,
    private readonly currency: string,
  ) {}

  static create(amount: number, currency = 'USD'): Money {
    if (amount < 0) {
      throw new Error('Price cannot be negative')
    }
    if (!currency || currency.trim().length !== 3) {
      throw new Error('Currency must be a 3-letter code')
    }
    return new Money(Math.round(amount * 100) / 100, currency.toUpperCase())
  }

  getAmount(): number {
    return this.amount
  }

  getCurrency(): string {
    return this.currency
  }

  add(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new Error('Cannot add different currencies')
    }
    return Money.create(this.amount + other.amount, this.currency)
  }

  equals(other: Money): boolean {
    return this.amount === other.amount && this.currency === other.currency
  }

  toString(): string {
    return `${this.amount.toFixed(2)} ${this.currency}`
  }

  toJSON() {
    return { amount: this.amount, currency: this.currency }
  }
}
