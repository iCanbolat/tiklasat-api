import {
  boolean,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { ProductTable } from './products.schema';
import { relations, sql } from 'drizzle-orm';

export const CategoryTable = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  parentId: uuid('parent_id'),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  description: text('description'),
  imageUrl: varchar('image_url', { length: 1024 }),
  banner: varchar('banner', { length: 1024 }),
  isActive: boolean('is_active').default(true),
  isFeatured: boolean('is_featured').default(false),
  metaTitle: varchar('meta_title', { length: 60 }),
  metaDescription: varchar('meta_description', { length: 160 }),
  metaKeywords: varchar('meta_keywords', { length: 200 }),
  displayOrder: integer('display_order').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdateFn(() => sql`now()`),
});

export const ProductCategoryTable = pgTable(
  'products_to_categories',
  {
    productId: uuid('product_id')
      .references(() => ProductTable.id, {
        onDelete: 'cascade',
      })
      .notNull(),
    categoryId: uuid('category_id')
      .references(() => CategoryTable.id, {
        onDelete: 'cascade',
      })
      .notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.productId, t.categoryId] }),
  }),
);

export const productsToCategoriesRelations = relations(
  ProductCategoryTable,
  ({ one }) => ({
    category: one(CategoryTable, {
      fields: [ProductCategoryTable.categoryId],
      references: [CategoryTable.id],
    }),
    product: one(ProductTable, {
      fields: [ProductCategoryTable.productId],
      references: [ProductTable.id],
    }),
  }),
);

export const categoryRelations = relations(CategoryTable, ({ many, one }) => ({
  products: many(ProductCategoryTable),
  subcategories: one(CategoryTable, {
    fields: [CategoryTable.parentId],
    references: [CategoryTable.id],
  }),
}));
