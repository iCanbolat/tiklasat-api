import { relations, sql } from 'drizzle-orm';
import {
  pgTable,
  timestamp,
  uuid,
  pgEnum,
  text,
  jsonb,
  AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { z } from 'zod';
import { UserTable } from './users.schema';
import { PaymentTable } from './payments.schema';
import { OrderItemTable } from './order-items.schema';
import { CustomerTable } from './customer-details.schema';
import { AddressTable } from './addresses.schema';
import { GuestTable } from './guests.schema';

export const OrderStatusEnum = pgEnum('order_status', [
  'PLACED',
  'CONFIRMED',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'RETURNED',
]);

const GuestUserSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  phone: z.string(),
  address: z.string(),
});

export const OrderStatus = z.enum(OrderStatusEnum.enumValues);
export type OrderStatusType = z.infer<typeof OrderStatus>;

export const OrderTable = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  customerId: uuid('customer_id').references(() => CustomerTable.id, {
    onDelete: 'cascade',
  }),
  guestId: uuid('guest_id').references(() => GuestTable.id, { onDelete: 'cascade' }),
  billingAddressId: uuid('billing_address_id')
    .references((): AnyPgColumn => AddressTable.id, { onDelete: 'set null' })
    .default(null),
  shippingAddressId: uuid('shipping_address_id')
    .references((): AnyPgColumn => AddressTable.id, { onDelete: 'set null' })
    .default(null),
  status: OrderStatusEnum('status').default(OrderStatus.Enum.PLACED).notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).$onUpdate(
    () => new Date(),
  ),
});

export const orderRelations = relations(OrderTable, ({ many, one }) => ({
  customer: one(CustomerTable, {
    fields: [OrderTable.customerId],
    references: [CustomerTable.id],
  }),
  billingAddress: one(AddressTable, {
    fields: [OrderTable.billingAddressId],
    references: [AddressTable.id],
  }),
  shippingAddress: one(AddressTable, {
    fields: [OrderTable.shippingAddressId],
    references: [AddressTable.id],
  }),
  items: many(OrderItemTable),
  payment: one(PaymentTable),
}));

export type SelectOrder = typeof OrderTable.$inferSelect;
export type InsertOrder = typeof OrderTable.$inferInsert;
