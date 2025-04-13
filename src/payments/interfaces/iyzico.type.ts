import { PaymentCardType } from "src/database/schemas/payments.schema";

export type IyzicoWebhookData = {
  paymentConversationId: string;
  merchantId: number;
  token: string;
  status: IyzicoStatusEnum;
  iyziReferenceCode: string;
  iyziEventType: IyziEventTypeEnum;
  iyziEventTime: number;
  iyziPaymentId: number;
};

export enum IyziEventTypeEnum {
  API_AUTH,
  THREE_DS_AUTH,
  BKM_AUTH,
}

export enum IyzicoStatusEnum {
  FAILURE = 'FAILURE',
  SUCCESS = 'SUCCESS',
}

export type PaymentCard = {
  cardHolderName: string;
  cardNumber: string;
  expireYear: string;
  expireMonth: string;
  cvc: string;
};

export type SavedPaymentCard = {
  cardToken?: string;
  cardUserKey: string;
  ucsToken?: string;
  consumerToken?: string;
};

interface BasePaymentResult {
  status: string;
  paymentId: string;
  conversationId: string;
  price: number;
  paidPrice: number;
  currency: string;
  installment: number;
  paymentStatus: string;
  cardType: PaymentCardType;
  cardFamily: string;
  cardAssociation: string;
  cardToken: string;
  cardUserKey: string;
  binNumber: string;
  lastFourDigits: string;
}

export interface CheckoutFormResult extends BasePaymentResult {
  itemTransactions: {
    itemId: string;
    paidPrice: number;
    paymentTransactionId: string;
    price: number;
    quantity: number;
    status: string;
  }[];
}

export interface ThreeDSPaymentResult extends BasePaymentResult {
  authCode: string;
  mdStatus: number;
  hostReference: string;
}

export type PaymentResult = CheckoutFormResult | ThreeDSPaymentResult;

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface BuyerDetails {
  name: string;
  email: string;
  phone: string;
}

export interface PaymentResponse {
  buyer: BuyerDetails;
  total: number;
  cardFamily: string;
  cardType: PaymentCardType;
  installments: number;
  lastFourDigits: string;
  paymentId: string;
  addresses: string[];
  items: OrderItem[];
}
