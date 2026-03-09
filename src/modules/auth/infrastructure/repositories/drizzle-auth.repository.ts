import { eq } from 'drizzle-orm'
import { Repository, Autowired } from '@/core'
import { DatabaseService } from '@/core/services/database.service'
import { users, userProfiles } from '@/db/schema'
import type {
  IAuthRepository,
  CreateUserData,
  UserRecord,
  UserProfileRecord,
} from '../../domain/repositories/auth.repository'

@Repository()
export class DrizzleAuthRepository implements IAuthRepository {
  @Autowired() private readonly db!: DatabaseService

  async findUserByEmail(email: string): Promise<UserRecord | null> {
    const [user] = await this.db.active.select().from(users).where(eq(users.email, email)).limit(1)
    return user ?? null
  }

  async findUserById(id: string): Promise<UserRecord | null> {
    const [user] = await this.db.active.select().from(users).where(eq(users.id, id)).limit(1)
    return user ?? null
  }

  async findUserWithProfile(
    id: string,
  ): Promise<(UserRecord & { profile: UserProfileRecord | null }) | null> {
    const [user] = await this.db.active.select().from(users).where(eq(users.id, id)).limit(1)

    if (!user) return null

    const [profile] = await this.db.active
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, id))
      .limit(1)

    return { ...user, profile: profile ?? null }
  }

  async createUser(data: CreateUserData): Promise<UserRecord> {
    const [user] = await this.db.active.insert(users).values(data).returning()
    return user
  }

  async createProfile(userId: string): Promise<UserProfileRecord> {
    const [profile] = await this.db.active.insert(userProfiles).values({ userId }).returning()
    return profile
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.db.active.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, userId))
  }

  async updateAvatarUrl(userId: string, avatarUrl: string): Promise<UserProfileRecord> {
    const [profile] = await this.db.active
      .update(userProfiles)
      .set({ avatarUrl })
      .where(eq(userProfiles.userId, userId))
      .returning()
    return profile
  }
}
