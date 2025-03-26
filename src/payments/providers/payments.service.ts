import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import {
  CheckoutFormResponse,
  IProvider,
} from '../interfaces/payment-strategy.interface';
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
import { GuestTable } from 'src/database/schemas/guests.schema';
import { eq, sql } from 'drizzle-orm';
import { CustomerService } from 'src/auth/providers/customer.service';
import { OrdersService } from 'src/orders/orders.service';
import { Address } from 'src/common/types';

@Injectable()
export class PaymentsService {
  constructor(
    private stripePayment: StripePaymentStrategy,
    private iyzicoPayment: IyzicoPaymentStrategy,
    private drizzleService: DrizzleService,
    private customerService: CustomerService,
    private orderService: OrdersService,
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

  async findOne(paymentId: string): Promise<any> {
    return await this.drizzleService.db
      .select()
      .from(PaymentTable)
      .where(eq(PaymentTable.paymentId, paymentId))
      .execute();
  }

  async getCheckoutFormPaymentResult(
    provider: PaymentProvider,
    token: string,
    ip: string,
    userId?: string,
  ): Promise<CheckoutFormResponse> {
    const strategy = this.getPaymentProvider(provider);
    const result = await strategy.getCheckoutFormPaymentResult(token);

    const customer = await this.customerService.findOrCreate({
      email: result.buyer.email,
      phone: result.buyer.phone,
      userId,
    });

    const { id: orderId } = await this.orderService.create({
      items: result.items,
      customer,
    });

    const [{ paymentCreatedAt }] = await this.drizzleService.db
      .insert(PaymentTable)
      .values({
        amount: String(result.total),
        cardFamily: result.cardFamily,
        cardType: result.cardType,
        currency: 'USD',
        lastFourDigits: result.lastFourDigits,
        installments: result.installments,
        paymentId: result.paymentId,
        [`${customer.type}Id`]: customer.id,
        orderId,
        ip,
      })
      .returning({ paymentCreatedAt: PaymentTable.createdAt });

    const { addressStrings } = await this.customerService.prepareAddressData(
      result.addresses,
      customer,
      orderId,
    );

    return {
      orderId,
      email: result.buyer.email,
      name: result.buyer.name,
      paymentCreatedAt,
      total: result.total,
      billingAddress: addressStrings.at(0),
      shippingAddress: addressStrings.at(1),
      items: result.items,
    };
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
