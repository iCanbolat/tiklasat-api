import {
  AnyPgColumn,
  customType,
  decimal,
  integer,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { UserTable } from './users.schema';
import { relations } from 'drizzle-orm';
import { OrderTable } from './orders.schema';
import { AddressTable } from './addresses.schema';

export const CustomerTable = pgTable('customer_details', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => UserTable.id, {
      onDelete: 'set null',
    }),
  loyaltyPoints: integer('loyalty_points').default(0),
  totalOrders: integer('total_orders').default(0),
  totalSpent: decimal('total_spent', { precision: 10, scale: 2 }).default('0'),
  billingAddressId: uuid('billing_address_id').references(
    (): AnyPgColumn => AddressTable.id,
    { onDelete: 'set null' },
  ),
  shippingAddressId: uuid('shipping_address_id').references(
    (): AnyPgColumn => AddressTable.id,
    { onDelete: 'set null' },
  ),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
});

export const customerRelations = relations(CustomerTable, ({ one, many }) => ({
  user: one(UserTable, {
    fields: [CustomerTable.userId],
    references: [UserTable.id],
  }),
  orders: many(OrderTable),
}));
