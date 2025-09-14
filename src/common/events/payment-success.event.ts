import { Address, IOrderInstanceDto, OrderItem } from 'src/common/types';

export class PaymentSuccessEvent {
  constructor(
    public readonly orderData: {
      items: OrderItem[];
      paymentSessionId: string;
      address: Address[];
      email: string;
      orderNumber: string;
      orderId: string;
      total: number;
    },
  ) {}
}
