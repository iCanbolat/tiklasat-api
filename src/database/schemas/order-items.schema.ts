import { integer, pgTable, uuid } from "drizzle-orm/pg-core";
import { OrderTable } from "./orders.schema";
import { ProductTable } from "./products.schema";
import { relations } from "drizzle-orm";

export const OrderItemTable = pgTable('order_items', {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id').references(() => OrderTable.id, {
      onDelete: 'cascade',
    }),
    productId: uuid('product_id').references(() => ProductTable.id, {
      onDelete: 'cascade',
    }),
    quantity: integer('quantity').notNull(),
  });
  
  export const orderItemRelations = relations(OrderItemTable, ({ one }) => ({
    order: one(OrderTable, {
      fields: [OrderItemTable.orderId],
      references: [OrderTable.id],
    }),
    product: one(ProductTable, {
      fields: [OrderItemTable.productId],
      references: [ProductTable.id],
    }),
  }));