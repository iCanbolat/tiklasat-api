import { CategoryTable } from './categories.schema';
import { OrderItemTable } from './order-items.schema';
import { OrderTable } from './orders.schema';
import { PaymentTable } from './payments.schema';
import { ProductTable } from './products.schema';
import { ReviewTable } from './reviews.schema';
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
  orders: OrderTable,
  orderItems: OrderItemTable,
  payments: PaymentTable,
  reviews: ReviewTable,
  categories: CategoryTable,
};
