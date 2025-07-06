import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
} from 'drizzle-orm/pg-core';
import { pgEnum } from 'drizzle-orm/pg-core';

export const NotificationTypeEnum = pgEnum('notification_type', [
  'ORDER',
  'INVENTORY',
  'CUSTOMER',
  'PAYMENT',
  'SYSTEM',
]);

export const NotificationTable = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: NotificationTypeEnum('type').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  link: varchar('link', { length: 1024 }),
  isRead: boolean('is_read').default(false),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
});
