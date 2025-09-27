import { Buyer } from 'src/common/types';
import { OrderStatusType } from 'src/database/schemas/orders.schema';

export type CustomerIdentifier = Buyer & {
  userId?: string;
  guestId?: string;
  identityNo?: string;
};

export type CustomerType = 'guest' | 'user';

export type Customer = Omit<CustomerIdentifier, 'guestId' | 'userId'> & {
  id: string;
  type: CustomerType;
  loyaltyPoints?: number;
  totalSpent?: number;
  totalOrders?: number;
};

// Enhanced types for service methods with optional includes
export interface CustomerWithOptions {
  id: string;
  type: CustomerType;
  name?: string;
  email?: string;
  phone?: string;
  addresses?: Address[];
  orders?: CustomerOrder[];
  loyaltyPoints?: number;
  totalOrders?: number;
  totalSpent?: number;
}

export interface CustomerOrder {
  id: string;
  status: OrderStatusType;
  createdAt: Date;
  billingAddress?: Address;
  shippingAddress?: Address;
  items?: any[];
  payment?: any;
}

export interface Address {
  id?: string;
  type: 'billing' | 'shipping';
  street: string;
  city: string;
  state?: string;
  zipCode?: string;
  country: string;
}
