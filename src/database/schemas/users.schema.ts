import { sql } from 'drizzle-orm';
import { text, pgTable, timestamp, uuid, pgEnum } from 'drizzle-orm/pg-core';
import { z } from 'zod';

const UserRoleStatusEnum = pgEnum('user_role_status', ['ADMIN', 'EDITOR']);

export const UserRole = z.enum(UserRoleStatusEnum.enumValues); 
export type UserRoleType = z.infer<typeof UserRole>;

export const UserTable = pgTable('users', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    email: text('email').unique().notNull(),
    password: text('password').notNull(),
    role: UserRoleStatusEnum('role').default(UserRole.enum.ADMIN).notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow().$onUpdateFn(() => sql`now()`),
  });
  
  export type SelectUser = typeof UserTable.$inferSelect;
  export type InsertUser = typeof UserTable.$inferInsert;
 