import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaymentProvider } from '../payments.enum';

export class CheckoutFormRetrieveRequest {
  @IsString()
  token: string;

  @IsString()
  orderId: string;

  @IsEnum(PaymentProvider)
  provider: PaymentProvider;

  @IsOptional()
  @IsString()
  userId?: string;
}
