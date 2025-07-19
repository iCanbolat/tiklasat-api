import { addressRelations, AddressTable } from './addresses.schema';
import {
  categoryRelations,
  CategoryTable,
  ProductCategoryTable,
  productsToCategoriesRelations,
} from './categories.schema';
import { customerRelations, CustomerTable } from './customer-details.schema';
import { guestRelations, GuestTable } from './guests.schema';
import { NotificationTable } from './notifications.schema';
import { orderItemRelations, OrderItemTable } from './order-items.schema';
import { orderRelations, OrderTable } from './orders.schema';
import { paymentRelations, PaymentTable } from './payments.schema';
import {
  productImageRelations,
  ProductImageTable,
  productRelations,
  ProductSagaLogTable,
  ProductTable,
  productVariantRelations,
  ProductVariantTable,
  relatedProductRelations,
  RelatedProductTable,
} from './products.schema';
import { reviewRelations, ReviewTable } from './reviews.schema';
import { userRelations, UserTable } from './users.schema';
import { wishListRelations, WishlistTable } from './wishlists.schema';

export {
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
  addresses: AddressTable,
  wishLists: WishlistTable,
  guestsTable: GuestTable,
  customerDetails: CustomerTable,
  relatedProducts: RelatedProductTable,
  notifications: NotificationTable,
  ProductSagaLogTable: ProductSagaLogTable,
  wishListRelations: wishListRelations,
  relatedProductRelations: relatedProductRelations,
  customerRelations: customerRelations,
  guestRelations: guestRelations,
  userRelations: userRelations,
  addressRelations: addressRelations,
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
