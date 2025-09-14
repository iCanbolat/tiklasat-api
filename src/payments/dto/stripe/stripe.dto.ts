import { IsNotEmpty, IsObject, IsOptional, IsString, IsUrl } from "class-validator";
import { BaseInitCheckoutDto } from "../base-payment.dto";

export class StripeCheckoutDTO extends BaseInitCheckoutDto {
 
  @IsNotEmpty()
  @IsUrl()
  success_url: string;

  @IsNotEmpty()
  @IsUrl()
  cancel_url: string;
 
  @IsOptional()
  @IsString()
  customer_email?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
