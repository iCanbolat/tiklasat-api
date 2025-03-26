import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { MailService } from 'src/mail/mail.service';
import { OrdersService } from 'src/orders/orders.service';
import { PaymentSuccessEvent } from '../events/payment-success.event';
import { PaymentsService } from 'src/payments/providers/payments.service';
import { CustomerService } from 'src/auth/providers/customer.service';

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
      const { paymentId, ...rest } = orderData;

      const payment = await this.paymentService.findOne(paymentId);

      const { id } = await this.orderService.update(payment.orderId, {
        status: 'CONFIRMED',
      });

      await this.mailService.sendPaymentReceipt({
        email: 'rest.customer.email',
        items: rest.items,
        total: payment.amount,
      });

      this.logger.log(`Order created successfully for user: `);
    } catch (error) {
      this.logger.error(`Order creation failed: ${error.message}`);
    }
  }
}
