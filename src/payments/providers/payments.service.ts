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

import { eq, sql } from 'drizzle-orm';
import { CustomerService } from 'src/auth/providers/customer.service';
import { OrdersService } from 'src/orders/orders.service';
import { Address } from 'src/common/types';
import { PaymentStatusType } from 'src/database/schemas/payments.schema';
import { OrderStatus } from 'src/database/schemas/orders.schema';
import { CheckoutFormRetrieveRequest } from '../dto/checkout-retrieve-req.dto';
import { IyzicoInitCheckoutDto } from '../dto/iyzico/iyzico-init-checkout.dto';

@Injectable()
export class PaymentsService {
  constructor(
    private stripePayment: StripePaymentStrategy,
    private iyzicoPayment: IyzicoPaymentStrategy,
    private drizzleService: DrizzleService,
    private customerService: CustomerService,
    private orderService: OrdersService,
  ) {}

  getPaymentProvider(provider: PaymentProvider): IProvider {
    switch (provider) {
      case PaymentProvider.STRIPE:
        return this.stripePayment;
      case PaymentProvider.IYZICO:
        return this.iyzicoPayment;
      default:
        throw new BadRequestException('Invalid payment provider');
    }
  }
  async createThreeDsPaymentSession(
    provider: PaymentProvider,
    paymentData: any,
  ): Promise<any> {
    const strategy = this.getPaymentProvider(provider as PaymentProvider);
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

  async update(iyziPaymentId: string, status: PaymentStatusType) {
    return await this.drizzleService.db
      .update(PaymentTable)
      .set({ status })
      .where(sql`${PaymentTable.paymentId} = ${iyziPaymentId}`)
      .returning({
        orderId: PaymentTable.orderId,
        total: PaymentTable.amount,
      })
      .then((res) => res[0]);
  }

  async createCheckoutFormSession(
    provider: PaymentProvider,
    checkoutInitDto: IyzicoInitCheckoutDto,
  ): Promise<{ token?: string; paymentUrl: string }> {
    const strategy = this.getPaymentProvider(provider);
    const isExistingOrderPayment =
      await this.drizzleService.db.query.payments.findFirst({
        where: (p) => eq(p.orderId, checkoutInitDto.orderId),
      });

    if (isExistingOrderPayment)
      throw new BadRequestException(
        `This order has already payment process : ${isExistingOrderPayment.conversationId}`,
      );

    const order = await this.drizzleService.db.query.orders.findFirst({
      where: (item) => eq(item.id, checkoutInitDto.orderId),
    });

    if (!order) throw new BadRequestException('Order does not exists.');

    return await strategy.createCheckoutFormSession(
      checkoutInitDto,
      order.orderNumber,
    );
  }

  async getCheckoutFormPaymentResult(
    checkoutFormRetrieveRequest: CheckoutFormRetrieveRequest,
    ip: string,
  ): Promise<CheckoutFormResponse> {
    const { orderId, provider, token } = checkoutFormRetrieveRequest;

    const strategy = this.getPaymentProvider(provider);
    const result = await strategy.getCheckoutFormPaymentResult(token);

    console.log('getCheckoutFormPaymentResult', result);

    const [{ paymentCreatedAt }] = await this.drizzleService.db
      .insert(PaymentTable)
      .values({
        amount: String(result.total),
        cardFamily: result.cardFamily,
        cardType: result.cardType,
        conversationId: result.orderNumber,
        lastFourDigits: result.lastFourDigits,
        installments: result.installments,
        paymentId: result.paymentId,
        [`${result.buyer.type}Id`]: result.buyer.id,
        currency: 'USD',
        orderId,
        ip,
      })
      .returning({ paymentCreatedAt: PaymentTable.createdAt });

    return {
      orderNumber: result.orderNumber,
      email: result.buyer.email,
      name: result.buyer.name,
      paymentCreatedAt,
      total: result.total,
      billingAddress: result.billingAddress,
      shippingAddress: result.shippingAddress,
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
