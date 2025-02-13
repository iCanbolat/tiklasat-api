import { IsString, IsNumber, IsOptional } from 'class-validator';

export class StripeInitCheckoutDto {
  @IsNumber()
  amount: number;

  @IsString()
  currency: string;

  @IsString()
  successUrl: string;

  @IsString()
  cancelUrl: string;

  @IsOptional()
  @IsString()
  customerEmail?: string;
}
