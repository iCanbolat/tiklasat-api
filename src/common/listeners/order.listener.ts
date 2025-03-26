import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { OrdersService } from 'src/orders/orders.service';
// import { PaymentSuccessEvent } from 'src/payments/events/payment-success.event';
import { MailService } from 'src/mail/mail.service';
import { PaymentSuccessEvent } from '../events/payment-success.event';

@Injectable()
export class OrderListener {
  private readonly logger = new Logger(OrderListener.name);

  constructor(
    private readonly orderService: OrdersService,
    private readonly mailService: MailService,
  ) {}

  // @OnEvent('payment.success')
  // async handlePaymentSuccess({ orderData }: PaymentSuccessEvent) {
  //   try {
  //     const { orderId, ...rest } = orderData;
  //     const { id } = await this.orderService.update(orderId, rest);

  //     await this.mailService.sendPaymentReceipt({
  //       email: rest.customer.email,
  //       items: rest.items,
  //       total: rest.total,
  //     });

  //     this.logger.log(
  //       `Order created successfully for user: ${rest.customer.email}`,
  //     );
  //   } catch (error) {
  //     this.logger.error(`Order creation failed: ${error.message}`);
  //   }
  // }

  // @OnEvent('payment.confirm')
  // async handlePaymentConfirm({ orderInstance }: PaymentSuccessEvent) {
  //   this.logger.log(
  //     `Payment successful for user: ${orderInstance.buyer.email}, creating order...`,
  //   );

  //   try {
  //     // const order = await this.orderService.create();
  //     this.logger.log(
  //       `Order created successfully for user: ${orderInstance.buyer.email}`,
  //     );
  //   } catch (error) {
  //     this.logger.error(`Order creation failed: ${error.message}`);
  //   }
  // }
}
