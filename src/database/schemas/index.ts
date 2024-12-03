import {
  categoryRelations,
  CategoryTable,
  ProductCategoryTable,
  productsToCategoriesRelations,
} from './categories.schema';
import { orderItemRelations, OrderItemTable } from './order-items.schema';
import { orderRelations, OrderTable } from './orders.schema';
import { paymentRelations, PaymentTable } from './payments.schema';
import {
  productImageRelations,
  ProductImageTable,
  productRelations,
  ProductTable,
  productVariantRelations,
  ProductVariantTable,
} from './products.schema';
import { reviewRelations, ReviewTable } from './reviews.schema';
import { UserTable } from './users.schema';

export {
  OrderTable,
  OrderItemTable,
  PaymentTable,
  ReviewTable,
  UserTable,
  ProductTable,
  CategoryTable,
};

export const databaseSchema = {
  users: UserTable,
  products: ProductTable,
  productVariants: ProductVariantTable,
  productCategoryPivot: ProductCategoryTable,
  productImages: ProductImageTable,
  orders: OrderTable,
  orderItems: OrderItemTable,
  payments: PaymentTable,
  reviews: ReviewTable,
  categories: CategoryTable,
  productsToCategoriesRelations: productsToCategoriesRelations,
  categoryRelations: categoryRelations,
  orderItemRelations: orderItemRelations,
  orderRelations: orderRelations,
  paymentRelations: paymentRelations,
  productImageRelations: productImageRelations,
  productVariantRelations: productVariantRelations,
  productRelations: productRelations,
  reviewRelations: reviewRelations,
};
