import {
  pgTable,
  primaryKey,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { ProductTable } from './products.schema';
import { relations, sql } from 'drizzle-orm';

export const CategoryTable = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  imageUrl: varchar('url', { length: 1024 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdateFn(() => sql`now()`),
});

export const ProductCategoryTable = pgTable(
  'products_to_categories',
  {
    productId: uuid('product_id').references(() => ProductTable.id, {
      onDelete: 'cascade',
    }),
    categoryId: uuid('category_id').references(() => CategoryTable.id, {
      onDelete: 'cascade',
    }),
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

export const categoryRelations = relations(CategoryTable, ({ many }) => ({
  products: many(ProductCategoryTable),
}));
