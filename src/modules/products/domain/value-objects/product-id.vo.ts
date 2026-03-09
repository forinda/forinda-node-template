import crypto from 'node:crypto'

export class ProductId {
  private constructor(private readonly value: string) {}

  static create(): ProductId {
    return new ProductId(crypto.randomUUID())
  }

  static from(id: string): ProductId {
    if (!id || id.trim().length === 0) {
      throw new Error('ProductId cannot be empty')
    }
    return new ProductId(id)
  }

  toString(): string {
    return this.value
  }

  equals(other: ProductId): boolean {
    return this.value === other.value
  }
}
