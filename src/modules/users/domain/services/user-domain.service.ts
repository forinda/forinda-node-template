import { Service, Inject } from '@/core'
import { User } from '../entities/user.entity'
import { Email } from '../value-objects/email.vo'
import { type IUserRepository, USER_REPOSITORY } from '../repositories/user.repository'

/**
 * Domain service — encapsulates business rules that don't belong to a single entity.
 * Single Responsibility Principle (S in SOLID).
 */
@Service()
export class UserDomainService {
  constructor(@Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository) {}

  async ensureEmailUnique(email: string): Promise<void> {
    const existing = await this.userRepo.findByEmail(Email.create(email))
    if (existing) {
      throw new Error(`Email already in use: ${email}`)
    }
  }

  async createUser(name: string, email: string): Promise<User> {
    await this.ensureEmailUnique(email)
    const user = User.create({ name, email })
    await this.userRepo.save(user)
    return user
  }
}
