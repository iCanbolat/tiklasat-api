import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { MailService } from 'src/mail/mail.service';
import { OrdersService } from 'src/orders/orders.service';
import { PaymentSuccessEvent } from '../events/payment-success.event';
import { PaymentsService } from 'src/payments/providers/payments.service';
import { CustomerService } from 'src/auth/providers/customer.service';
import {
  PaymentStatus,
  PaymentStatusEnum,
} from 'src/database/schemas/payments.schema';
import { OrderStatus } from 'src/database/schemas/orders.schema';
import { CustomerType } from 'src/auth/interfaces/customer.types';

@Injectable()
export class PaymentListener {
  private readonly logger = new Logger(PaymentListener.name);

  constructor(
    private readonly orderService: OrdersService,
    private readonly mailService: MailService,
    private readonly paymentService: PaymentsService,
    private readonly customerService: CustomerService,
  ) {}

  @OnEvent('payment.success')
  async handlePaymentSuccess({ orderData }: PaymentSuccessEvent) {
    try {
      const { paymentId, items, address, email } = orderData;

      const payment = await this.paymentService.update(
        paymentId,
        PaymentStatus.Enum.COMPLETED,
      );

      // console.log('PaymentListenerORderData:', orderData);

      await this.orderService.update(payment.orderId, {
        status: OrderStatus.Enum.CONFIRMED,
        addressIds: address.map((addr) => addr.id),
      });

      await this.mailService.sendPaymentReceipt({
        email,
        items,
        total: payment.total,
        billingAddress: address.at(0),
        shippingAddress: address.at(1),
        orderId: payment.orderId,
      });

      this.logger.log(`Order created successfully for user: `);
    } catch (error) {
      this.logger.error(`Order creation failed: ${error.message}`);
    }
  }
}
