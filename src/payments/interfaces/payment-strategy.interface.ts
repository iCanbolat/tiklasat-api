// import { CreateThreeDsPaymentDto } from '../dto/create-payment.dto';

import { Address, Buyer } from 'src/common/types';
import {
  PaymentCardFamily,
  PaymentCardType,
} from 'src/database/schemas/payments.schema';

export interface IProvider {
  createThreeDsPaymentSession(createThreeDsPaymentDto: any): Promise<any>;

  createRefund(refundDto: any): Promise<any>;

  createCheckoutFormSession(
    checkoutInitDto: any,
  ): Promise<{ paymentUrl: string; token?: string }>;

  getOrderData(token: string): Promise<any>;

  getCheckoutFormPaymentResult(token: string): Promise<CheckoutFormResult>;

  getThreeDSPaymentResult(token: string): Promise<any>;

  handleWebhook(data: any, headers: Headers): Promise<any>;
}

export type CheckoutFormResult = {
  total: number | string;
  buyer: Buyer;
  cardType: PaymentCardType;
  cardFamily: PaymentCardFamily;
  installments: number;
  lastFourDigits: string;
  paymentId: string;
  addresses: Address[];
};
