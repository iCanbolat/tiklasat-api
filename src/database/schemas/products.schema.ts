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
  pgEnum,
} from 'drizzle-orm/pg-core';
import { ReviewTable } from './reviews.schema';
import { OrderItemTable } from './order-items.schema';
import { ProductCategoryTable } from './categories.schema';
import { z } from 'zod';

const CurrencyEnumCol = pgEnum('currency_enum', ['USD', 'TRY']);

export const CurrencyEnum = z.enum(CurrencyEnumCol.enumValues);
export type CurrencyType = z.infer<typeof CurrencyEnum>;

export const ProductTable = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  price: decimal('price', { precision: 10, scale: 2 })
    .notNull()
    .$type<number>(),
  slug: varchar('slug', { length: 255 }).notNull(),
  currency: CurrencyEnumCol('currency').default('USD'),
  stockQuantity: integer('stock_quantity').default(0).notNull(),
  isFeatured: boolean('is_featured').default(false).notNull(),
  isVariant: boolean('is_variant').default(false).notNull(),
  parentId: uuid('parent_id'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).$onUpdate(
    () => new Date(),
  ),
});

export const ProductVariantTable = pgTable('product_variants', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id').references(() => ProductTable.id, {
    onDelete: 'cascade',
  }),
  variantType: varchar('variant_type', { length: 50 }).notNull(),
  value: varchar('value', { length: 50 }).notNull(),
});

export const ProductImageTable = pgTable('product_images', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id').references(() => ProductTable.id, {
    onDelete: 'cascade',
  }),
  url: varchar('url', { length: 1024 }).notNull(),
});

export const productImageRelations = relations(
  ProductImageTable,
  ({ one }) => ({
    product: one(ProductTable, {
      fields: [ProductImageTable.productId],
      references: [ProductTable.id],
    }),
  }),
);

export const productVariantRelations = relations(
  ProductVariantTable,
  ({ one, many }) => ({
    product: one(ProductTable, {
      relationName: 'productAttributes',
      fields: [ProductVariantTable.productId],
      references: [ProductTable.id],
    }),
  }),
);

export const productRelations = relations(ProductTable, ({ many, one }) => ({
  images: many(ProductImageTable),
  productVariants: many(ProductTable, { relationName: 'productVariants' }),
  parent: one(ProductTable, {
    relationName: 'productVariants',
    fields: [ProductTable.parentId],
    references: [ProductTable.id],
  }),
  reviews: many(ReviewTable),
  attributes: many(ProductVariantTable, { relationName: 'productAttributes' }),
  orderItems: many(OrderItemTable),
  categories: many(ProductCategoryTable),
}));
