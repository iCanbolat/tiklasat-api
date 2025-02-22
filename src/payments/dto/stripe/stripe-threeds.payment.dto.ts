import { IsNumber, IsString } from 'class-validator';

export class StripeThreeDsPaymentDto {
  @IsNumber()
  amount: number;

  @IsString()
  currency: string;

  // @IsString()
  // returnUrl: string;
}
