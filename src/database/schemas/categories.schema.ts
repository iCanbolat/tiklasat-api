import {
  pgTable,
  primaryKey,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import {  ProductTable } from './products.schema';
import { InferSelectModel, relations, sql } from 'drizzle-orm';

export const CategoryTable = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  imageUrl: varchar('image_url', { length: 1024 }),
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

export const categoryRelations = relations(CategoryTable, ({ many }) => ({
  products: many(ProductCategoryTable),
}));
 