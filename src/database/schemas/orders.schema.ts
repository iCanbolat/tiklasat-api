import { relations, sql } from 'drizzle-orm';
import {
  text,
  pgTable,
  timestamp,
  uuid,
  varchar,
  boolean,
  decimal,
  integer,
  numeric,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { z } from 'zod';
import { UserTable } from './users.schema';
// import { StoreTable } from './store';
import { PaymentTable } from './payments.schema';
import { OrderItemTable } from './order-items.schema';

export const OrderTable = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => UserTable.id, {
    onDelete: 'cascade',
  }),
  // storeId: uuid('store_id').references(() => StoreTable.id, { onDelete: 'cascade' }),
  status: varchar('status', { length: 50 }).default('Pending').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const orderRelations = relations(OrderTable, ({ many, one }) => ({
  user: one(UserTable, {
    fields: [OrderTable.userId],
    references: [UserTable.id],
  }),
  // store: one(StoreTable, { fields: [OrderTable.storeId], references: [StoreTable.id] }),
  items: many(OrderItemTable),
  payment: one(PaymentTable),
}));
