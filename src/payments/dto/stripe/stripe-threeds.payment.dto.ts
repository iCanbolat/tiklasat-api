import { IsString } from 'class-validator';

export class StripeThreeDsPaymentDto {
  @IsString()
  paymentIntentId: string;

  @IsString()
  paymentMethodId: string;

  @IsString()
  returnUrl: string;
}
