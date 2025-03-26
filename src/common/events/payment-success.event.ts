import { IOrderInstanceDto, OrderItem } from 'src/common/types';
import { Customer } from 'src/payments/interfaces/payment-strategy.interface';

export class PaymentSuccessEvent {
  constructor(
    public readonly orderData: {
      
      items: OrderItem[];
      paymentId: string;
    },
  ) {}
}
