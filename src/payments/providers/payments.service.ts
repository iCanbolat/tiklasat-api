import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { IProvider } from '../interfaces/payment-strategy.interface';
import { IyzicoPaymentStrategy } from '../strategies/iyzico.strategy';
import { StripePaymentStrategy } from '../strategies/stripe.strategy';
// import { CheckoutInitDto } from './dto/init-checkout-form.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PaymentSuccessEvent } from '../events/payment-success.event';
import { PaymentProvider } from '../payments.enum';
import { DrizzleService } from 'src/database/drizzle.service';
import { PaymentTable } from 'src/database/schemas';
import { CustomerTable } from 'src/database/schemas/customer-details.schema';
import { AddressTable } from 'src/database/schemas/addresses.schema';

@Injectable()
export class PaymentsService {
  constructor(
    private stripePayment: StripePaymentStrategy,
    private iyzicoPayment: IyzicoPaymentStrategy,
    private drizzleService: DrizzleService,
    private eventEmitter: EventEmitter2,
  ) {}

  getPaymentProvider(provider: string): IProvider {
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

  async createRefund(provider: PaymentProvider, refundData: any): Promise<any> {
    const strategy = this.getPaymentProvider(provider);
    return strategy.createRefund(refundData);
  }

  async getCheckoutFormPaymentResult(
    provider: PaymentProvider,
    token: string,
    userId?: string,
  ): Promise<any> {
    const strategy = this.getPaymentProvider(provider);
    const result = await strategy.getCheckoutFormPaymentResult(token);
    let customerId: string;

    await this.drizzleService.db.insert(PaymentTable).values({
      amount: String(result.total),
      cardFamily: result.cardFamily,
      cardType: result.cardType,
      currency: 'USD',
      lastFourDigits: result.lastFourDigits,
      installments: result.installments,
      paymentId: result.paymentId,
    });

    if (userId) {
      [customerId] = await this.drizzleService.db
        .insert(CustomerTable)
        .values({
          userId,
        })
        .returning({ id: CustomerTable.id })
        .then((res) => res.map((r) => r.id));
    }

    result.addresses.forEach(async (address) => {
      await this.drizzleService.db.insert(AddressTable).values({
        customerId: userId,
        street: address.street,
        city: address.city,
        country: address.country,
        zipCode: address.zipCode,
        state: address.state,
        addressType: address.addressType,
      });
    });
  }

  async getThreeDSPaymentResult(
    provider: PaymentProvider,
    paymentId: string,
  ): Promise<any> {
    const strategy = this.getPaymentProvider(provider);
    return strategy.getThreeDSPaymentResult(paymentId);
  }

  async handleWebhook(
    provider: PaymentProvider,
    data: any,
    headers: Headers,
  ): Promise<any> {
    const strategy = this.getPaymentProvider(provider);
    return strategy.handleWebhook(data, headers);
  }
}
