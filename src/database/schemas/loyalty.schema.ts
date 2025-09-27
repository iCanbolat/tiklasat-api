import { relations } from 'drizzle-orm';
import {
  pgTable,
  timestamp,
  uuid,
  varchar,
  decimal,
  pgEnum,
  integer,
  text,
} from 'drizzle-orm/pg-core';
import { CustomerTable } from './customer-details.schema';
import { OrderTable } from './orders.schema';
import { z } from 'zod';

export const LoyaltyTransactionTypeEnum = pgEnum('loyalty_transaction_type', [
  'EARNED',
  'REDEEMED',
  'EXPIRED',
  'REFUNDED',
  'ADJUSTED',
]);

export const LoyaltyTransactionType = z.enum(
  LoyaltyTransactionTypeEnum.enumValues,
);
export type LoyaltyTransactionTypeType = z.infer<typeof LoyaltyTransactionType>;

export const LoyaltyTransactionTable = pgTable('loyalty_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .references(() => CustomerTable.userId, {
      onDelete: 'cascade',
    })
    .notNull(),
  orderId: uuid('order_id').references(() => OrderTable.id, {
    onDelete: 'set null',
  }),
  type: LoyaltyTransactionTypeEnum('type').notNull(),
  points: integer('points').notNull(), // Positive for earned, negative for redeemed
  discountAmount: decimal('discount_amount', { precision: 10, scale: 2 }), // Only for redeemed transactions
  description: text('description'),
  previousBalance: integer('previous_balance').notNull(),
  newBalance: integer('new_balance').notNull(),
  expiresAt: timestamp('expires_at', { mode: 'date' }), // For earned points that expire
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
});

export const DiscountTable = pgTable('discounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id')
    .references(() => OrderTable.id, {
      onDelete: 'cascade',
    })
    .notNull(),
  userId: uuid('user_id').references(() => CustomerTable.userId, {
    onDelete: 'cascade',
  }),
  loyaltyTransactionId: uuid('loyalty_transaction_id').references(
    () => LoyaltyTransactionTable.id,
    {
      onDelete: 'set null',
    },
  ),
  discountType: varchar('discount_type', { length: 50 }).notNull(), // 'LOYALTY_POINTS', 'COUPON', 'PROMO'
  discountAmount: decimal('discount_amount', {
    precision: 10,
    scale: 2,
  }).notNull(),
  originalTotal: decimal('original_total', {
    precision: 10,
    scale: 2,
  }).notNull(),
  finalTotal: decimal('final_total', { precision: 10, scale: 2 }).notNull(),
  pointsRedeemed: integer('points_redeemed'), // Only for loyalty point discounts
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
});

export const loyaltyTransactionRelations = relations(
  LoyaltyTransactionTable,
  ({ one }) => ({
    customer: one(CustomerTable, {
      fields: [LoyaltyTransactionTable.userId],
      references: [CustomerTable.userId],
    }),
    order: one(OrderTable, {
      fields: [LoyaltyTransactionTable.orderId],
      references: [OrderTable.id],
    }),
  }),
);

export const discountRelations = relations(DiscountTable, ({ one }) => ({
  order: one(OrderTable, {
    fields: [DiscountTable.orderId],
    references: [OrderTable.id],
  }),
  customer: one(CustomerTable, {
    fields: [DiscountTable.userId],
    references: [CustomerTable.userId],
  }),
  loyaltyTransaction: one(LoyaltyTransactionTable, {
    fields: [DiscountTable.loyaltyTransactionId],
    references: [LoyaltyTransactionTable.id],
  }),
}));
