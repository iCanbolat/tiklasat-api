import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { OrdersService } from 'src/orders/orders.service';
import { PaymentSuccessEvent } from 'src/payments/events/payment-success.event';
import { MailService } from 'src/mail/mail.service';

@Injectable()
export class OrderListener {
  private readonly logger = new Logger(OrderListener.name);

  constructor(
    private readonly orderService: OrdersService,
    private readonly mailService: MailService,
  ) {}

  @OnEvent('payment.success')
  async handlePaymentSuccess({ orderInstance }: PaymentSuccessEvent) {
    try {
      const { id } = await this.orderService.create(orderInstance);

     await this.mailService.sendPaymentReceipt({
        email: orderInstance.buyer.email,
        items: orderInstance.items,
        total: orderInstance.total,
        name: orderInstance.buyer.name,
      });

      this.logger.log(
        `Order created successfully for user: ${orderInstance.buyer.email}`,
      );
    } catch (error) {
      this.logger.error(`Order creation failed: ${error.message}`);
    }
  }

  @OnEvent('payment.confirm')
  async handlePaymentConfirm({ orderInstance }: PaymentSuccessEvent) {
    this.logger.log(
      `Payment successful for user: ${orderInstance.buyer.email}, creating order...`,
    );

    try {
      // const order = await this.orderService.create();
      this.logger.log(
        `Order created successfully for user: ${orderInstance.buyer.email}`,
      );
    } catch (error) {
      this.logger.error(`Order creation failed: ${error.message}`);
    }
  }
}
