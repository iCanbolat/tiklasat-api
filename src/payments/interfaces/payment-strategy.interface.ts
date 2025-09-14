// import { CreateThreeDsPaymentDto } from '../dto/create-payment.dto';

import { Address, Buyer, OrderItem } from 'src/common/types';
import { PaymentCardType } from 'src/database/schemas/payments.schema';
import { PaymentResult } from './iyzico.type';
import { CustomerType } from 'src/auth/interfaces/customer.types';

export interface IProvider {
  createThreeDsPaymentSession(createThreeDsPaymentDto: any): Promise<any>;

  createRefund(refundDto: any): Promise<any>;

  createCheckoutFormSession(
    checkoutInitDto: any,
    orderId?: string,
  ): Promise<{ paymentUrl: string; token?: string }>;

  // getOrderData(token: string): Promise<any>;

  getCheckoutFormPaymentResult(token: string): Promise<CheckoutFormResult>;

  getThreeDSPaymentResult(token: string): Promise<any>;

  handleWebhook(data: any, headers: Headers): Promise<any>;

  populateOrderData(orderId: string, checkoutInitDto: any): Promise<any>;
}

export type CheckoutFormResult = {
  total: number | string;
  buyer: Buyer & { id: string; type: CustomerType };
  cardType: PaymentCardType;
  cardFamily: string;
  installments: number;
  lastFourDigits: string;
  paymentId?: string;
  addresses: Address[];
  items: OrderItem[];
  // items: BasketItem[];
  orderNumber: string;
  billingAddress: string;
  shippingAddress: string;
};

export type CheckoutFormResponse = {
  items: OrderItem[];
  // items: BasketItem[];
  total: number | string;
  billingAddress: string;
  shippingAddress: string;
  orderNumber: string;
  paymentCreatedAt: Date;
  email?: string;
  name: string;
};

export type BasketItem = { productId: string; quantity: number };
