import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class StripeRefundDto {
  @IsNotEmpty()
  @IsString()
  paymentIntentId: string;

  @IsNotEmpty()
  @IsNumber()
  amount: number;
}
