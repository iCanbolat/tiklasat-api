import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaymentProvider } from '../payments.enum';

export class BaseInitCheckoutDto {
  @IsEnum(PaymentProvider)
  provider: PaymentProvider;

  @IsUUID()
  orderId: string;

  @IsOptional()
  @IsUUID()
  userId?: string;
}
