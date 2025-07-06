import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationsService } from './notifications.service';

@Injectable()
export class NotificationListener {
  constructor(private notificationsService: NotificationsService) {}

  @OnEvent('order.created')
  async handleOrderCreatedEvent(order: any) {
    await this.notificationsService.create({
      type: 'ORDER',
      title: 'New Order',
      message: `Order #${order.id} created for $${order.total}`,
      link: `/orders/${order.id}`,
    });
  }

  @OnEvent('payment.created')
  async handlePaymentCreatedEvent(payment: { id: string; total: number }) {
    await this.notificationsService.create({
      type: 'PAYMENT',
      title: 'New Payment Recieved',
      message: `Payment #${payment.id} recieved for $${payment.total}`,
      link: `/payments/${payment.id}`,
    });
  }
}
