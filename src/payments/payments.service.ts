import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { PaymentStrategy } from './interfaces/payment-strategy.interface';
import { IyzicoPaymentStrategy } from './strategies/iyzico.strategy';
import { StripePaymentStrategy } from './strategies/stripe.strategy';
 // import { CheckoutInitDto } from './dto/init-checkout-form.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PaymentSuccessEvent } from './events/payment-success.event';
import { PaymentProvider } from './payments.enum';

@Injectable()
export class PaymentsService {
  constructor(
    private stripePayment: StripePaymentStrategy,
    private iyzicoPayment: IyzicoPaymentStrategy,
    private eventEmitter: EventEmitter2,
  ) {}

  getPaymentProvider(provider: string): PaymentStrategy {
    switch (provider) {
      case PaymentProvider.STRIPE:
        return this.stripePayment;
      case PaymentProvider.IYZICO:
        return this.iyzicoPayment;
      default:
        throw new BadRequestException('Invalid payment provider');
    }
  }
  async createCheckoutFormSession(
    provider: string,
    checkoutInitDto: any,
  ): Promise<{ token?: string; paymentUrl: string }> {
    const strategy = this.getPaymentProvider(provider);
    return await strategy.createCheckoutFormSession(checkoutInitDto);
  }

  async createThreeDsPaymentSession(
    provider: PaymentProvider,
    paymentData: any,
  ): Promise<any> {
    const strategy = this.getPaymentProvider(provider);
    return strategy.createThreeDsPaymentSession(paymentData);
  }

  async getCheckoutFormPaymentResult(
    provider: PaymentProvider,
    token: string,
  ): Promise<any> {
    const strategy = this.getPaymentProvider(provider);
    return strategy.getCheckoutFormPaymentResult(token);
  }

  async getThreeDSPaymentResult(
    provider: PaymentProvider,
    paymentId: string,
  ): Promise<any> {
    const strategy = this.getPaymentProvider(provider);
    return strategy.getThreeDSPaymentResult(paymentId);
  }

  async handleWebhook(provider: PaymentProvider, data: any, headers: Headers): Promise<any> {
    const strategy = this.getPaymentProvider(provider);
    return strategy.handleWebhook(data, headers);
  }
}
