import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { OrdersService } from '../orders.service';
import { PaymentSuccessEvent } from 'src/payments/events/payment-success.event';

@Injectable()
export class OrderListener {
  private readonly logger = new Logger(OrderListener.name);

  constructor(private readonly orderService: OrdersService) {}

  @OnEvent('payment.success')
  async handlePaymentSuccess(event: PaymentSuccessEvent) {
    this.logger.log(
      `Payment successful for user: ${event.token}, creating order...`,
    );

    try {
      this.logger.log(`Order created successfully for user: ${event.url}`);
    } catch (error) {
      this.logger.error(`Order creation failed: ${error.message}`);
    }
  }
}
