import { Repository } from '@/core'
import { User } from '../../domain/entities/user.entity'
import { UserId } from '../../domain/value-objects/user-id.vo'
import { Email } from '../../domain/value-objects/email.vo'
import type { IUserRepository } from '../../domain/repositories/user.repository'

/**
 * Liskov Substitution Principle (L in SOLID) —
 * This can be swapped for a Postgres/Mongo implementation
 * without changing any consumer code.
 */
@Repository()
export class InMemoryUserRepository implements IUserRepository {
  private store = new Map<string, User>()

  async findById(id: UserId): Promise<User | null> {
    return this.store.get(id.toString()) ?? null
  }

  async findByEmail(email: Email): Promise<User | null> {
    for (const user of this.store.values()) {
      if (user.email.equals(email)) return user
    }
    return null
  }

  async findAll(): Promise<User[]> {
    return Array.from(this.store.values())
  }

  async save(user: User): Promise<void> {
    this.store.set(user.id.toString(), user)
  }

  async delete(id: UserId): Promise<void> {
    this.store.delete(id.toString())
  }
}
