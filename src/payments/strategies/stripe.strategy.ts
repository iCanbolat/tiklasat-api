import { Inject, Injectable, Logger, RawBodyRequest } from '@nestjs/common';
import { PaymentStrategy } from '../interfaces/payment-strategy.interface';
import Stripe from 'stripe';
import { StripeInitCheckoutDto } from '../dto/stripe/stripe-init-checkout.dto';
import { MailService } from 'src/mail/mail.service';

@Injectable()
export class StripePaymentStrategy implements PaymentStrategy {
  private readonly logger = new Logger(StripePaymentStrategy.name);
  private stripe: Stripe;

  constructor(
    @Inject('StripeConfig') private readonly stripeConfig,
    private readonly mailService: MailService,
  ) {
    this.stripe = new Stripe(this.stripeConfig.secretKey, {
      apiVersion: '2025-01-27.acacia',
    });
  }

  getThreeDSPaymentResult(token: string): Promise<any> {
    throw new Error('Method not implemented.');
  }

  async handleWebhook(
    data: Buffer<ArrayBufferLike>,
    headers: Headers,
  ): Promise<any> {
    const signature = headers['stripe-signature'];
    const das = await data.toJSON();
    console.log('data Json', das);

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(
        data,
        signature,
        'whsec_ff8188bdb0a593efdf9e6992affbc1b071f2440ec65672b458931461e810df12',
      );
    } catch (error) {
      console.log('Error verifying webhook signature:', error);

      return { status: 'error' };
    }

    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;

        const lineItems = await this.stripe.checkout.sessions.listLineItems(
          session.id,
        );

        const items = lineItems.data.map((item) => ({
          name: item.description,
          quantity: item.quantity,
          price: (item.amount_total / 100).toFixed(2),
        }));

        const receiptData = {
          email: session.customer_details.email,
          name: session.customer_details.name,
          items,
          total: session.amount_total,
        };

        await this.mailService.sendPaymentReceipt(receiptData);

        this.logger.log(
          `✅ Payment successful, email sent to ${session.customer_details.email}`,
        );

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
