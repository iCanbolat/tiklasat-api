import { Inject, Injectable } from '@nestjs/common';
import { PaymentStrategy } from '../interfaces/payment-strategy.interface';
import Stripe from 'stripe';
import { StripeInitCheckoutDto } from '../dto/stripe/stripe-init-checkout.dto';

@Injectable()
export class StripePaymentStrategy implements PaymentStrategy {
  private stripe: Stripe;

  constructor(@Inject('StripeConfig') private readonly stripeConfig) {
    this.stripe = new Stripe(this.stripeConfig.secretKey, {
      apiVersion: '2025-01-27.acacia',
    });
  }

  getThreeDSPaymentResult(token: string): Promise<any> {
    throw new Error('Method not implemented.');
  }
  handleWebhook(data: any, headers: Headers): any {
    const signature = headers['stripe-signature'];
    const body = JSON.stringify(data);

    let event;
    try {
      event = this.stripe.webhooks.constructEvent(
        body,
        signature,
        this.stripeConfig.webhookSecret,
      );
    } catch (error) {
      console.log('Error verifying webhook signature:', error);

      return { status: 'error' };
    }

    switch (event.type) {
      case 'checkout.session.completed':
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }
  }
  createThreeDsPaymentSession(createThreeDsPaymentDto: any): Promise<any> {
    return Promise.resolve('This action adds a new payment');
  }

  async createCheckoutFormSession(
    stripeInitCheckoutDto: StripeInitCheckoutDto,
  ): Promise<{ token?: string; paymentUrl: string }> {
    const response = await this.stripe.checkout.sessions.create(
      stripeInitCheckoutDto,
    );

    return { paymentUrl: response.url };
  }
  async getCheckoutFormPaymentResult(token: string): Promise<any> {
    return await this.stripe.checkout.sessions.retrieve(token);
  }
}
