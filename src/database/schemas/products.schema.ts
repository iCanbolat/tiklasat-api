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
  stockQuantity: integer('total_stock_quantity').default(0).notNull(),
  isFeatured: boolean('is_featured').default(false).notNull(),
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
  stockQuantity: integer('stock_quantity').default(0).notNull(),
  price: decimal('price', { precision: 10, scale: 2 })
    .notNull()
    .$type<number>(),
});

export const ProductImageTable = pgTable('product_images', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id').references(() => ProductTable.id, {
    onDelete: 'cascade',
  }),
  productVariantId: uuid('product_variant_id').references(() => ProductVariantTable.id, {
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
    productVariant: one(ProductVariantTable, {
      fields: [ProductImageTable.productVariantId],
      references: [ProductVariantTable.id],
    }),
  }),
);

export const productVariantRelations = relations(
  ProductVariantTable,
  ({ one, many }) => ({
    product: one(ProductTable, {
      fields: [ProductVariantTable.productId],
      references: [ProductTable.id],
    }),
    reviews: many(ReviewTable),
    images: many(ProductImageTable),
  }),
);

export const productRelations = relations(ProductTable, ({ many, one }) => ({
  images: many(ProductImageTable),
  variants: many(ProductVariantTable),
  reviews: many(ReviewTable),
  orderItems: many(OrderItemTable),
  categories: many(ProductCategoryTable),
}));
