import { relations, sql } from 'drizzle-orm';
import {
  pgTable,
  timestamp,
  uuid,
  pgEnum,
  text,
  jsonb,
} from 'drizzle-orm/pg-core';
import { z } from 'zod';
import { UserTable } from './users.schema';
import { PaymentTable } from './payments.schema';
import { OrderItemTable } from './order-items.schema';

export const OrderStatusEnum = pgEnum('order_status', [
  'PLACED',           
  'CONFIRMED',        
  'SHIPPED',         
  'DELIVERED',    
  'CANCELLED',        
  'RETURNED',       
]);

const GuestUserSchema = z.object({
  name: z.string(),  
  email: z.string().email(),  
  phone: z.string(), 
  address: z.string()
});

export const OrderStatus = z.enum(OrderStatusEnum.enumValues); 
export type OrderStatusType = z.infer<typeof OrderStatus>;

type GuestUserType = z.infer<typeof GuestUserSchema>;

export const OrderTable = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => UserTable.id, {
    onDelete: 'cascade',
  }),
  guestUser: jsonb('guest_user').$type<GuestUserType>(),
  status: OrderStatusEnum('status').default(OrderStatus.Enum.PLACED).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdateFn(() => sql`now()`),
});

export const orderRelations = relations(OrderTable, ({ many, one }) => ({
  user: one(UserTable, {
    fields: [OrderTable.userId],
    references: [UserTable.id],
  }),
  items: many(OrderItemTable),
  payment: one(PaymentTable),
}));

export type SelectOrder = typeof OrderTable.$inferSelect;
