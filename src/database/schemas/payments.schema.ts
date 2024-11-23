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
import { OrderTable } from './orders.schema';

export const PaymentTable = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').references(() => OrderTable.id, {
    onDelete: 'cascade',
  }),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('USD'),
  paymentMethod: varchar('payment_method', { length: 50 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const paymentRelations = relations(PaymentTable, ({ one }) => ({
  order: one(OrderTable, {
    fields: [PaymentTable.orderId],
    references: [OrderTable.id],
  }),
}));
