export class CategoryName {
  private constructor(private readonly value: string) {}

  static create(name: string): CategoryName {
    const trimmed = name?.trim()
    if (!trimmed || trimmed.length < 2) {
      throw new Error('Category name must be at least 2 characters')
    }
    if (trimmed.length > 100) {
      throw new Error('Category name must be at most 100 characters')
    }
    return new CategoryName(trimmed)
  }

  toString(): string {
    return this.value
  }

  equals(other: CategoryName): boolean {
    return this.value === other.value
  }
}
