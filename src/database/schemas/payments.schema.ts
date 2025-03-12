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
} from 'drizzle-orm/pg-core';
import { OrderTable } from './orders.schema';
import { CustomerTable } from './customer-details.schema';
import { z } from 'zod';

export const CardTypeEnum = pgEnum('card_type', ['CREDIT_CARD', 'DEBIT_CARD']);
export const CardFamilyEnum = pgEnum('card_family', [
  'BONUS',
  'AXESS',
  'WORLD',
  'CARD_F',
  'PARAF',
  'MAXIMUM',
  'ADVANTAGE',
]);
export const PaymentStatusEnum = pgEnum('payment_status', [
  'PENDING',
  'COMPLETED',
  'FAILED',
  'REFUNDED',
]);

export const CardType = z.enum(CardTypeEnum.enumValues);
export type PaymentCardType = z.infer<typeof CardType>;

export const CardFamily = z.enum(CardFamilyEnum.enumValues);
export type PaymentCardFamily = z.infer<typeof CardFamily>;

export const PaymentStatus = z.enum(PaymentStatusEnum.enumValues);
export type PaymentStatusType = z.infer<typeof PaymentStatus>;

// const decimalNumber = customType<{ data: number }>({
//   dataType() {
//     return 'numeric(10, 2)';
//   },
//   fromDriver(value) {
//     return Number(value);
//   },
// });

export const PaymentTable = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').references(() => OrderTable.id, {
    onDelete: 'cascade',
  }),
  customerId: uuid('customer_id').references(() => CustomerTable.id, {
    onDelete: 'cascade',
  }),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('USD'),
  cardType: CardTypeEnum('card_type').notNull(),
  cardFamily: CardFamilyEnum('card_family').notNull(),
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
    fields: [PaymentTable.customerId],
    references: [CustomerTable.id],
  }),
}));
