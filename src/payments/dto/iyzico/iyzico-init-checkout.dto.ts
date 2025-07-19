import { IsString, IsNumber, IsOptional, IsArray } from 'class-validator';
import { IyzicoBaseDto } from './base-payment.dto';

export class IyzicoInitCheckoutDto extends IyzicoBaseDto {
  @IsString()
  callbackUrl: string;

  @IsOptional()
  @IsArray()
  enabledInstallments?: Array<1 | 2 | 3 | 6 | 9>;
}
