// import { CreateThreeDsPaymentDto } from '../dto/create-payment.dto';

import { Address, Buyer, OrderItem } from 'src/common/types';
import { PaymentCardType } from 'src/database/schemas/payments.schema';
import { PaymentResult } from './iyzico.type';
import { CustomerType } from 'src/auth/interfaces/customer.types';

export interface IProvider {
  createThreeDsPaymentSession(
    createThreeDsPaymentDto: unknown,
  ): Promise<unknown>;

  createRefund(refundDto: unknown): Promise<unknown>;

  createCheckoutFormSession(
    checkoutInitDto: unknown,
    orderNumber: string,
  ): Promise<{ paymentUrl: string; token?: string }>;

  getCheckoutFormPaymentResult(token: string): Promise<CheckoutFormResult>;

  getThreeDSPaymentResult(token: string): Promise<unknown>;

  handleWebhook(
    data: unknown,
    headers: Headers,
  ): Promise<{ status: string; message?: string }>;

  populateOrderData(
    orderId: string,
    userId?: string,
    pointsToRedeem?: number,
  ): Promise<PopulateOrderDataResult | null>;
}

export interface PopulateOrderDataResult {
  lineItems: unknown[];
  calculatedTotal: number;
  orderItems: OrderItem[];
  loyaltyDiscount?: {
    pointsToRedeem: number;
    discountAmount: number;
    finalTotal: number;
  };
}

export interface CheckoutFormResult {
  total: number;
  buyer: Buyer & { id: string; type: CustomerType };
  cardType: PaymentCardType;
  cardFamily: string;
  installments: number;
  lastFourDigits: string;
  paymentId: string;
  addresses: Address[];
  items: OrderItem[];
  orderNumber: string;
  billingAddress: string;
  shippingAddress: string;
  customerType: CustomerType;
  loyalty?: LoyaltyInfo;
  guest?: GuestInfo;
}

export interface LoyaltyInfo {
  pointsRedeemed?: number;
  discountAmount?: number;
  pointsEarned: number;
}

export interface GuestInfo {
  message: string;
  potentialPointsIfRegistered: number;
  registrationBenefit: string;
  totalSpent: number;
}

export interface CheckoutFormResponse {
  items: OrderItem[];
  total: number;
  billingAddress: string;
  shippingAddress: string;
  orderNumber: string;
  paymentCreatedAt: Date;
  email?: string;
  name: string;
  customerType?: CustomerType;
  loyalty?: LoyaltyInfo;
  guest?: GuestInfo;
}

export type BasketItem = { productId: string; quantity: number };
