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
import { ProductTable, ProductVariantTable } from './products.schema';
import { UserTable } from './users.schema';

export const ReviewTable = pgTable('reviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id').references(() => ProductTable.id, {
    onDelete: 'cascade',
  }),
  userId: uuid('user_id').references(() => UserTable.id, {
    onDelete: 'cascade',
  }),
  productVariantId: uuid('product_variant_id').references(
    () => ProductVariantTable.id,
    {
      onDelete: 'cascade',
    },
  ),
  rating: integer('rating').notNull(),
  comment: text('comment'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
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
  variant: one(ProductVariantTable, {
    fields: [ReviewTable.productVariantId],
    references: [ProductVariantTable.id],
  }),
}));
