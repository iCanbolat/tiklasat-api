import { PaymentCardType } from '@codingwithmanny/iyzipay-js/_dist/_types/types/models';
import { OrderStatusType } from 'src/database/schemas/orders.schema';
import { PaymentCard, SavedPaymentCard } from 'src/payments/interfaces/iyzico.type';
import {
  IProduct,
  IProductAttributes,
  IProductImages,
} from 'src/products/interfaces';

export type PaginatedResults<T> = {
  data: T[];
  pagination: {
    totalRecords: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
};

export type AddressType = 'billing' | 'shipping';

export enum AddressTypeEnum {
  BILLING = 'billing',
  SHIPPING = 'shipping',
}

export type Address = {
  id?: string;
  type: AddressType;
  street: string;
  city: string;
  state?: string;
  zipCode?: string;
  country: string;
};

export type Buyer = {
  name?: string;
  email: string;
  phone?: string;
};

export type OrderItem = {
  quantity: number;
  product: IProduct & {
    attributes: IProductAttributes[];
    images: IProductImages[];
  };
};

export interface IOrderInstanceDto {
  userId?: string;
  status: OrderStatusType;
  total: number | string;
  buyer: Buyer;
  address: Address[];
  items: OrderItem[];
  paymentCard?: PaymentCard | SavedPaymentCard;
}
