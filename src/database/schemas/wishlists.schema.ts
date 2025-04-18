import { pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';
import { CustomerTable } from './customer-details.schema';
import { ProductTable } from './products.schema';
import { relations } from 'drizzle-orm';

export const WishlistTable = pgTable('wishlist', {
  id: uuid('id').primaryKey().defaultRandom(),
  customerId: uuid('customer_id').references(() => CustomerTable.userId, {
    onDelete: 'cascade',
  }),
  productId: uuid('product_id').references(() => ProductTable.id, {
    onDelete: 'cascade',
  }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
});

export const wishListRelations = relations(WishlistTable, ({ one, many }) => ({
  customer: one(CustomerTable, {
    fields: [WishlistTable.customerId],
    references: [CustomerTable.userId],
  }),
  product: one(ProductTable, {
    fields: [WishlistTable.productId],
    references: [ProductTable.id],
  }),
}));
