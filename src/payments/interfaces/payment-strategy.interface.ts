// import { CreateThreeDsPaymentDto } from '../dto/create-payment.dto';

export interface PaymentStrategy {
  createThreeDsPayment(createThreeDsPaymentDto: any): Promise<any>;

  initCheckoutForm(checkoutInitDto: any): Promise<any>;

  getCheckoutFormPaymentResult(token: string): Promise<any>;

  handleWebhook(data: any): Promise<any>;
}
