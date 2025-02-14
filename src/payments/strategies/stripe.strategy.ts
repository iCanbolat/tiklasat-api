import { Injectable } from "@nestjs/common";
import { PaymentStrategy } from "../interfaces/payment-strategy.interface";


@Injectable()
export class StripePaymentStrategy implements PaymentStrategy {
  getThreeDSPaymentResult(token: string): Promise<any> {
    throw new Error("Method not implemented.");
  }
  handleWebhook(data: any): Promise<any> {
    throw new Error("Method not implemented.");
  }
  createThreeDsPaymentSession(createThreeDsPaymentDto: any): Promise<any> {
    return Promise.resolve('This action adds a new payment');
  }

  createCheckoutFormSession(checkoutInitDto: any): any {
    return 'This action adds a new payment';
  }
  getCheckoutFormPaymentResult(token: string): Promise<any> {
    return Promise.resolve('This action adds a new payment');
  }
}