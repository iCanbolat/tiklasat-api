import { InferSelectModel, relations, sql } from 'drizzle-orm';
import { serial, text, pgTable, timestamp, uuid, varchar, boolean, decimal, integer, numeric } from 'drizzle-orm/pg-core';
import { pgEnum } from 'drizzle-orm/pg-core';
import { z } from 'zod';
import { createSelectSchema } from 'drizzle-zod';


export const OrderStatus = pgEnum('order_status', ['PREPARING', 'SHIPPED', 'DELIVERED']);
export const CartItemStatus = pgEnum('cart_item_status', ['IN_CART', 'REMOVED', 'PURCHASED']);
export const UserRoleStatusEnum = pgEnum('user_role_status', ['ADMIN', 'CUSTOMER']);
export const ProductStatusEnum = pgEnum('product_status', ['DRAFT', 'ACTIVE']);

export const userRoleStatus = z.enum(UserRoleStatusEnum.enumValues);
export const productStatus = z.enum(ProductStatusEnum.enumValues);


// Users Table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name'),
  email: text('email').unique().notNull(),
  emailVerified: timestamp('email_verified'),
  password: text('password'),
  role: varchar('role', { length: 20 }).default(userRoleStatus.Enum.ADMIN).notNull(),
  image: text('image'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdateFn(() => sql`now()`),
});

// Sessions Table
export const sessions = pgTable('sessions', {
  sessionToken: text('session_token').notNull().unique(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdateFn(() => sql`now()`),
});

// Verification Tokens Table
export const verificationTokens = pgTable('verification_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull(),
  token: text('token').notNull().unique(),
  expires: timestamp('expires').notNull(),
});

// Password Reset Tokens Table
export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull(),
  token: text('token').notNull().unique(),
  expires: timestamp('expires').notNull(),
});

// Categories Table
export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  image: text('image'),
  slug: text('slug').notNull(),
});

// Products Table
export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  slug: text('slug').unique().notNull(), 
  isFeatured: boolean('is_featured').default(false),
  status: varchar('status', { length: 20 }).default(productStatus.Enum.ACTIVE),
  seoTitle: text('seo_title'),
  seoDescription: text('seo_description'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdateFn(() => sql`now()`),
});
 
// Product Variants Table
export const productVariants = pgTable('product_variants', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  variantName: text('variant_name').default('default'),
  price: numeric('price', { precision: 10, scale: 2 }).default('0').notNull(),  
  stock: integer('stock').default(0),
  discountedPrice: numeric('price', { precision: 10, scale: 2 }).default('0'),
  sku: text('sku'),
  barcode: text('barcode'),  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdateFn(() => sql`now()`),
});

// Variant Options Table
export const variantOptions = pgTable('variant_options', {
  id: uuid('id').primaryKey().defaultRandom(),
  productVariantId: text('product_variant_id').notNull().references(() => productVariants.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  value: text('value').notNull(),
});

// Relations for products
export const productsRelations = relations(products, ({ many }) => ({
  variants: many(productVariants),
}));

// Relations for productVariants
export const productVariantsRelations = relations(productVariants, ({ one, many }) => ({
  product: one(products, { fields: [productVariants.productId], references: [products.id] }),
  options: many(variantOptions),
}));

// Relations for variantOptions
export const variantOptionsRelations = relations(variantOptions, ({ one }) => ({
  variant: one(productVariants, { fields: [variantOptions.productVariantId], references: [productVariants.id] }),
}));


// Define relations for the Users table
export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
}));

// Define relations for the Sessions table
export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));