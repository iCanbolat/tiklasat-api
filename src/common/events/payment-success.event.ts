import { Address, IOrderInstanceDto, OrderItem } from 'src/common/types';

export class PaymentSuccessEvent {
  constructor(
    public readonly orderData: {
      items: OrderItem[];
      paymentId: string;
      address: Address[];
      email: string;
    },
  ) {}
}
