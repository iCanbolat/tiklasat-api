import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { MailService } from 'src/mail/mail.service';
import { OrdersService } from 'src/orders/orders.service';
import { PaymentSuccessEvent } from '../../common/events/payment-success.event';
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
      const { items, address, email, orderNumber, orderId, total } = orderData;

      await this.paymentService.update(
        { orderId },
        PaymentStatus.Enum.COMPLETED,
      );

      console.log('PaymentListenerORderData:', orderData);

      await this.orderService.update(orderId, {
        status: OrderStatus.Enum.PROCESSING,
        // addressIds: address.map((addr) => addr.id),
      });

      await this.mailService.sendPaymentReceipt({
        email,
        items,
        total,
        billingAddress: address.at(0),
        shippingAddress: address.at(1),
        orderId: orderNumber,
      });

      this.logger.log(`Order created successfully for user: `);
    } catch (error) {
      this.logger.error(`Order creation failed: ${error.message}`);
    }
  }

  @OnEvent('payment.failure')
  async handlePaymentFailure({ orderData }: PaymentSuccessEvent) {
    try {
      const { orderId } = orderData;

      await this.paymentService.update({ orderId }, PaymentStatus.Enum.FAILED);

      this.logger.log(`Payment failed for order: ${orderId}`);
    } catch (error) {
      this.logger.error(`Payment failure handling failed: ${error.message}`);
    }
  }
}
