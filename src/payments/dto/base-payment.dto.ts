import {
  IsEnum,
  IsOptional,
  IsUUID,
  IsNumber,
  Min,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentProvider } from '../payments.enum';

export class BaseInitCheckoutDto {
  @IsEnum(PaymentProvider)
  provider: PaymentProvider;

  @IsUUID()
  orderId: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsNumber()
  @Min(100)
  @Type(() => Number)
  pointsToRedeem?: number;
}
