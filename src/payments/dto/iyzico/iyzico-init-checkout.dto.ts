import { IsString, IsNumber, IsOptional, IsArray } from 'class-validator';
import { BasePaymentDto } from './base-payment.dto';

export class IyzicoInitCheckoutDto extends BasePaymentDto {
  @IsString()
  callbackUrl: string;

  @IsOptional()
  @IsArray()
  enabledInstallments?: Array<1 | 2 | 3 | 6 | 9>;
}
