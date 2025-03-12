import { relations } from 'drizzle-orm';
import {
  AnyPgColumn,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { OrderTable } from './orders.schema';
import { CustomerTable } from './customer-details.schema';

export const AddressTable = pgTable('addresses', {
  id: uuid('id').primaryKey().defaultRandom(),
  customerId: uuid('customer_id').references(() => CustomerTable.id, {
    onDelete: 'cascade',
  }),
  orderId: uuid('order_id').references((): AnyPgColumn => OrderTable.id, {
    onDelete: 'cascade',
  }),
  addressType: varchar('address_type', { length: 20 }).notNull(), // 'billing' or 'shipping'
  street: varchar('street', { length: 255 }).notNull(),
  city: varchar('city', { length: 100 }).notNull(),
  state: varchar('state', { length: 100 }),
  zipCode: varchar('zip_code', { length: 20 }),
  country: varchar('country', { length: 100 }).notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
});

export const addressRelations = relations(AddressTable, ({ one }) => ({
  customer: one(CustomerTable, {
    fields: [AddressTable.customerId],
    references: [CustomerTable.id],
  }),
  order: one(OrderTable, {
    fields: [AddressTable.orderId],
    references: [OrderTable.id],
  }),
}));
