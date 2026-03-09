import { pgTable, uuid, varchar, text, date, timestamp } from 'drizzle-orm/pg-core'
import { users } from './users'

export const userProfiles = pgTable('user_profiles', {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  avatarUrl: varchar('avatar_url', { length: 500 }),
  phone: varchar({ length: 20 }),
  bio: text(),
  dateOfBirth: date('date_of_birth'),
  address: varchar({ length: 500 }),
  city: varchar({ length: 100 }),
  country: varchar({ length: 100 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
})
