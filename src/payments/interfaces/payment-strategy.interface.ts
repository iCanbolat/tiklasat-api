// import { CreateThreeDsPaymentDto } from '../dto/create-payment.dto';

export interface PaymentStrategy {
  createThreeDsPaymentSession(createThreeDsPaymentDto: any): Promise<any>;

  createCheckoutFormSession(
    checkoutInitDto: any,
  ): Promise<{ paymentUrl: string; token?: string }>;

  getCheckoutFormPaymentResult(token: string): Promise<any>;

  getThreeDSPaymentResult(token: string): Promise<any>;

  handleWebhook(data: any): Promise<any>;
}
