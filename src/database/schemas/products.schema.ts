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
  primaryKey,
} from 'drizzle-orm/pg-core';
import { ReviewTable } from './reviews.schema';
import { OrderItemTable } from './order-items.schema';
import { ProductCategoryTable } from './categories.schema';
import { z } from 'zod';

const CurrencyEnumCol = pgEnum('currency_enum', ['USD', 'TRY']);

export const ProductStatusCol = pgEnum('product_status', [
  'ACTIVE',
  'ARCHIVED',
  'LOW_STOCK',
  'OUT_OF_STOCK',
]);

export const ProductStatusEnum = z.enum(ProductStatusCol.enumValues);
export type ProductStatusType = z.infer<typeof ProductStatusEnum>;

export const CurrencyEnum = z.enum(CurrencyEnumCol.enumValues);
export type CurrencyType = z.infer<typeof CurrencyEnum>;

export const ProductTable = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  price: decimal('price', { precision: 10, scale: 2 })
    .notNull()
    .$type<number>(),
  cost: decimal('cost', { precision: 10, scale: 2 }).$type<number>(),
  slug: varchar('slug', { length: 255 }).notNull(),
  sku: varchar('sku', { length: 255 }),
  currency: CurrencyEnumCol('currency').default('USD'),
  stockQuantity: integer('stock_quantity').default(0).notNull(),
  stockUnderThreshold: integer('stock_under_threshold').default(0),
  status: ProductStatusCol('status').default('ACTIVE'),
  isFeatured: boolean('is_featured').default(false).notNull(),
  metaTitle: varchar('meta_title', { length: 255 }),
  metaDescription: varchar('meta_description', { length: 255 }),
  metaKeywords: varchar('meta_keywords', { length: 255 }),
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

export const RelatedProductTable = pgTable(
  'related_products',
  {
    productId: uuid('product_id')
      .notNull()
      .references(() => ProductTable.id, { onDelete: 'cascade' }),

    relatedProductId: uuid('related_product_id')
      .notNull()
      .references(() => ProductTable.id, { onDelete: 'cascade' }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.productId, t.relatedProductId] }),
  }),
);

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

export const relatedProductRelations = relations(
  RelatedProductTable,
  ({ one }) => ({
    sourceProduct: one(ProductTable, {
      relationName: 'relatedSource',
      fields: [RelatedProductTable.productId],
      references: [ProductTable.id],
    }),
    targetProduct: one(ProductTable, {
      relationName: 'relatedTarget',
      fields: [RelatedProductTable.relatedProductId],
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
  relatedProducts: many(RelatedProductTable, {
    relationName: 'relatedSource',
  }),
  relatedTo: many(RelatedProductTable, {
    relationName: 'relatedTarget',
  }),
  reviews: many(ReviewTable),
  attributes: many(ProductVariantTable, { relationName: 'productAttributes' }),
  orderItems: many(OrderItemTable),
  categories: many(ProductCategoryTable),
}));
