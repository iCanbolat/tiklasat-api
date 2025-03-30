import { pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const GuestTable = pgTable('guests', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name'),
  email: varchar('email', { length: 255 }).unique().notNull(),
  phone: varchar('phone', { length: 50 }),
  createdAt: timestamp('created_at').defaultNow(),
});
