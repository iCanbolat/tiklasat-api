import { IOrderInstanceDto } from 'src/common/types';

export class PaymentSuccessEvent {
  constructor(public readonly orderInstance: IOrderInstanceDto) {}
}
