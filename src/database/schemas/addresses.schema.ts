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
import { GuestTable } from './guests.schema';

export const AddressTable = pgTable('addresses', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('customer_id').references(() => CustomerTable.userId, {
    onDelete: 'cascade',
  }),
  guestId: uuid('guest_id').references(() => GuestTable.id, {
    onDelete: 'cascade',
  }), // ✅ Guests
  orderId: uuid('order_id').references((): AnyPgColumn => OrderTable.id, {
    onDelete: 'cascade',
  }),
  type: varchar('address_type', { length: 20 }).notNull(), // 'billing' or 'shipping'
  street: varchar('street', { length: 255 }).notNull(),
  city: varchar('city', { length: 100 }).notNull(),
  state: varchar('state', { length: 100 }),
  zipCode: varchar('zip_code', { length: 20 }),
  country: varchar('country', { length: 100 }).notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
});

// export const addressRelations = relations(AddressTable, ({ one }) => ({
//   customer: one(CustomerTable, {
//     fields: [AddressTable.userId],
//     references: [CustomerTable.userId],
//   }),
//   order: one(OrderTable, {
//     fields: [AddressTable.orderId],
//     references: [OrderTable.id],
//   }),
// }));
export const addressRelations = relations(AddressTable, ({ one }) => ({
  customer: one(CustomerTable, {
    fields: [AddressTable.userId],
    references: [CustomerTable.userId],
  }),
  guest: one(GuestTable, {
    fields: [AddressTable.guestId],
    references: [GuestTable.id],
  }),
  order: one(OrderTable, {
    fields: [AddressTable.orderId],
    references: [OrderTable.id],
  }),
}));
