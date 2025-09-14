import { Type } from 'class-transformer';
import * as Iyzipay from 'iyzipay';
import {
  IsString,
  IsEnum,
  IsArray,
  ValidateNested,
  IsPhoneNumber,
  IsEmail,
  IsOptional,
} from 'class-validator';
import { BaseInitCheckoutDto } from '../base-payment.dto';

export class BasketItemDto {
  @IsString()
  id: string;

  @IsString()
  name: string;

  @IsString()
  category1: string;

  @IsOptional()
  @IsString()
  category2?: string;

  @IsEnum(Iyzipay.BASKET_ITEM_TYPE)
  itemType: keyof typeof Iyzipay.BASKET_ITEM_TYPE;

  @IsString()
  price: string;
}

export class BuyerDto {
  @IsString()
  id: string;

  @IsString()
  name: string;

  @IsString()
  surname: string;

  @IsOptional()
  @IsPhoneNumber()
  gsmNumber?: string;

  @IsEmail()
  email: string;

  @IsString()
  identityNumber: string;

  @IsString()
  registrationAddress: string;

  @IsOptional()
  @IsString()
  ip?: string;

  @IsString()
  city: string;

  @IsString()
  country: string;

  @IsOptional()
  @IsString()
  zipCode?: string;
}

export class IyzıcoAddressDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  contactName: string;

  @IsString()
  city: string;

  @IsString()
  state: string;

  @IsString()
  country: string;

  @IsString()
  address: string;

  @IsOptional()
  @IsString()
  zipCode?: string;
}

export class IyzicoBaseDto extends BaseInitCheckoutDto {
  @IsEnum(Iyzipay.LOCALE)
  @IsOptional()
  locale: keyof typeof Iyzipay.LOCALE;

  @IsOptional()
  @IsString()
  conversationId?: string;

  @IsOptional()
  @IsString()
  price?: string;

  @IsEnum(Iyzipay.CURRENCY)
  currency: keyof typeof Iyzipay.CURRENCY;

  @IsEnum(Iyzipay.PAYMENT_GROUP)
  paymentGroup: keyof typeof Iyzipay.PAYMENT_GROUP;

  @IsOptional()
  @IsString()
  paidPrice?: string;

  @IsOptional()
  @IsString()
  basketId?: string;

  @ValidateNested()
  @Type(() => BuyerDto)
  buyer: BuyerDto;

  @ValidateNested()
  @Type(() => IyzıcoAddressDto)
  shippingAddress: IyzıcoAddressDto;

  @ValidateNested()
  @Type(() => IyzıcoAddressDto)
  billingAddress: IyzıcoAddressDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BasketItemDto)
  basketItems?: BasketItemDto[];
}
