import { relations } from 'drizzle-orm';
import {
  pgTable,
  timestamp,
  uuid,
  varchar,
  numeric,
  pgEnum,
  customType,
  integer,
  decimal,
  text,
} from 'drizzle-orm/pg-core';
import { OrderTable } from './orders.schema';
import { CustomerTable } from './customer-details.schema';
import { z } from 'zod';
import { GuestTable } from './guests.schema';

export const CardTypeEnum = pgEnum('card_type', ['CREDIT_CARD', 'DEBIT_CARD']);
export const PaymentStatusEnum = pgEnum('payment_status', [
  'PENDING',
  'COMPLETED',
  'FAILED',
  'REFUNDED',
]);

export const CardType = z.enum(CardTypeEnum.enumValues);
export type PaymentCardType = z.infer<typeof CardType>;

export const PaymentStatus = z.enum(PaymentStatusEnum.enumValues);
export type PaymentStatusType = z.infer<typeof PaymentStatus>;

export const PaymentTable = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').references(() => OrderTable.id, {
    onDelete: 'cascade',
  }),
  userId: uuid('user_id').references(() => CustomerTable.userId, {
    onDelete: 'cascade',
  }),
  ip: varchar('ip_address').default(null),
  guestId: uuid('guest_id').references(() => GuestTable.id, {
    onDelete: 'cascade',
  }),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('USD'),
  cardType: CardTypeEnum('card_type').notNull(),
  cardFamily: text('card_family').notNull(),
  installments: integer('installments').default(1),
  paymentId: varchar('payment_id'),
  lastFourDigits: varchar('last_four_digits', { length: 4 }).notNull(),
  status: PaymentStatusEnum('payment_status')
    .default(PaymentStatus.Enum.PENDING)
    .notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const paymentRelations = relations(PaymentTable, ({ one }) => ({
  order: one(OrderTable, {
    fields: [PaymentTable.orderId],
    references: [OrderTable.id],
  }),
  customer: one(CustomerTable, {
    fields: [PaymentTable.userId],
    references: [CustomerTable.userId],
  }),
}));
