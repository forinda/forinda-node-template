import crypto from 'node:crypto'

export class CategoryId {
  private constructor(private readonly value: string) {}

  static create(): CategoryId {
    return new CategoryId(crypto.randomUUID())
  }

  static from(id: string): CategoryId {
    if (!id || id.trim().length === 0) {
      throw new Error('CategoryId cannot be empty')
    }
    return new CategoryId(id)
  }

  toString(): string {
    return this.value
  }

  equals(other: CategoryId): boolean {
    return this.value === other.value
  }
}
