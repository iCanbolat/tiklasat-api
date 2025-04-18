import { sql } from 'drizzle-orm';
import {
  text,
  pgTable,
  timestamp,
  uuid,
  pgEnum,
  varchar,
} from 'drizzle-orm/pg-core';
import { z } from 'zod';

const UserRoleStatusEnum = pgEnum('user_role_status', ['ADMIN', 'USER']);

export const UserRole = z.enum(UserRoleStatusEnum.enumValues);
export type UserRoleType = z.infer<typeof UserRole>;

export const UserTable = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name'),
  email: text('email').unique().notNull(),
  password: text('password'),
  phone: varchar('phone', { length: 50 }),
  role: UserRoleStatusEnum('role').default(UserRole.enum.ADMIN).notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).$onUpdate(
    () => new Date(),
  ),
});

export type SelectUser = typeof UserTable.$inferSelect;
export type InsertUser = typeof UserTable.$inferInsert;
