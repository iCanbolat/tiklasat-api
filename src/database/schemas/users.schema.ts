import { relations, sql } from 'drizzle-orm';
import { text, pgTable, timestamp, uuid, varchar, boolean, decimal, integer, numeric, pgEnum } from 'drizzle-orm/pg-core';
import { z } from 'zod';
// import { StoreTable } from './store';


export const UserRoleStatusEnum = pgEnum('user_role_status', ['ADMIN', 'EDITOR']);

export const userRoleStatus = z.enum(UserRoleStatusEnum.enumValues);

export const UserTable = pgTable('users', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    email: text('email').unique().notNull(),
    password: text('password').notNull(),
    role: varchar('role', { length: 20 }).default(userRoleStatus.Enum.EDITOR).notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow().$onUpdateFn(() => sql`now()`),
  });
  
  