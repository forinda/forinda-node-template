import { User } from '../entities/user.entity'
import { UserId } from '../value-objects/user-id.vo'
import { Email } from '../value-objects/email.vo'

/**
 * Repository interface — Dependency Inversion Principle (D in SOLID).
 * Domain depends on this abstraction; infrastructure provides the implementation.
 */
export interface IUserRepository {
  findById(id: UserId): Promise<User | null>
  findByEmail(email: Email): Promise<User | null>
  findAll(): Promise<User[]>
  save(user: User): Promise<void>
  delete(id: UserId): Promise<void>
}

// DI token — since TS interfaces don't exist at runtime
export const USER_REPOSITORY = Symbol('IUserRepository')
