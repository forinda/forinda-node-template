import crypto from 'node:crypto'

export class UserId {
  private constructor(private readonly value: string) {}

  static create(): UserId {
    return new UserId(crypto.randomUUID())
  }

  static from(id: string): UserId {
    if (!id || id.trim().length === 0) {
      throw new Error('UserId cannot be empty')
    }
    return new UserId(id)
  }

  toString(): string {
    return this.value
  }

  equals(other: UserId): boolean {
    return this.value === other.value
  }
}
