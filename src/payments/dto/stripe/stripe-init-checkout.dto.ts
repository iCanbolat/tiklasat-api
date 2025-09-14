import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
  IsUrl,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BaseInitCheckoutDto } from '../base-payment.dto';

enum PaymentMode {
  PAYMENT = 'payment',
  SUBSCRIPTION = 'subscription',
}

enum PaymentMethodType {
  CARD = 'card',
  IDEAL = 'ideal',
  ALIPAY = 'alipay',
}

class LineItemProductData {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  images?: string[];
}

class LineItemPriceData {
  @IsNotEmpty()
  @IsEnum(['usd', 'eur', 'gbp'])
  currency: string;

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => LineItemProductData)
  product_data: LineItemProductData;

  @IsNotEmpty()
  unit_amount: number; // Amount in cents (e.g., 100 = $1.00)
}

class LineItem {
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => LineItemPriceData)
  price_data: LineItemPriceData;

  @IsNotEmpty()
  quantity: number;
}

export class StripeInitCheckoutDto extends BaseInitCheckoutDto {
  // @IsString()
  // provider: string;

  @IsNotEmpty()
  @IsEnum(PaymentMode)
  mode: PaymentMode;

  @IsNotEmpty()
  @IsUrl()
  success_url: string;

  @IsNotEmpty()
  @IsUrl()
  cancel_url: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LineItem)
  line_items?: LineItem[];

  @IsOptional()
  @IsArray()
  @IsEnum(PaymentMethodType, { each: true })
  payment_method_types?: PaymentMethodType[];

  @IsOptional()
  @IsString()
  customer_email?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
