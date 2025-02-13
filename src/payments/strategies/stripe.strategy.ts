import { Injectable } from "@nestjs/common";
import { PaymentStrategy } from "../interfaces/payment-strategy.interface";


@Injectable()
export class StripePaymentStrategy implements PaymentStrategy {
  handleWebhook(data: any): Promise<any> {
    throw new Error("Method not implemented.");
  }
  createThreeDsPayment(createThreeDsPaymentDto: any): Promise<any> {
    return Promise.resolve('This action adds a new payment');
  }

  initCheckoutForm(checkoutInitDto: any): any {
    return 'This action adds a new payment';
  }
  getCheckoutFormPaymentResult(token: string): Promise<any> {
    return Promise.resolve('This action adds a new payment');
  }
}