import { relations, sql } from 'drizzle-orm';
import {
  text,
  pgTable,
  timestamp,
  uuid,
  varchar,
  boolean,
  decimal,
  integer,
  numeric,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { z } from 'zod';
import { ProductTable } from './products.schema';
import { UserTable } from './users.schema';

export const ReviewTable = pgTable('reviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id').references(() => ProductTable.id, {
    onDelete: 'cascade',
  }),
  userId: uuid('user_id').references(() => UserTable.id, {
    onDelete: 'cascade',
  }),
  rating: integer('rating').notNull(),
  comment: text('comment'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const reviewRelations = relations(ReviewTable, ({ one }) => ({
  product: one(ProductTable, {
    fields: [ReviewTable.productId],
    references: [ProductTable.id],
  }),
  user: one(UserTable, {
    fields: [ReviewTable.userId],
    references: [UserTable.id],
  }),
}));
