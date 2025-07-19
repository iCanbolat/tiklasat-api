import { relations } from 'drizzle-orm';
import { pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { AddressTable } from './addresses.schema';
import { OrderTable } from './orders.schema';

export const GuestTable = pgTable('guests', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name'),
  email: varchar('email', { length: 255 }).unique().notNull(),
  phone: varchar('phone', { length: 50 }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
});

export const guestRelations = relations(GuestTable, ({ many }) => ({
  addresses: many(AddressTable),
  orders: many(OrderTable),
}));
