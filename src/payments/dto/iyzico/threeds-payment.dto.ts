import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { BasePaymentDto } from './base-payment.dto';
import { Type } from 'class-transformer';
import * as Iyzipay from 'iyzipay';

class PaymentCardDto {
  @IsString()
  cardHolderName: string;

  @IsString()
  cardNumber: string;

  @IsString()
  expireMonth: string;

  @IsString()
  expireYear: string;

  @IsString()
  cvc: string;

  @IsString()
  cardAlias: string;

  @IsString()
  registerCard: number;
}

class SavedPaymentCard {
  @IsOptional()
  @IsString()
  cardToken?: string;

  @IsString()
  cardUserKey: string;

  @IsOptional()
  @IsString()
  ucsToken?: string;

  @IsOptional()
  @IsString()
  consumerToken: string;
}

export class CreateThreeDsPaymentDto extends BasePaymentDto {
  @ValidateNested()
  @Type(() => PaymentCardDto || SavedPaymentCard)
  paymentCard: PaymentCardDto | SavedPaymentCard;

  @IsEnum(Iyzipay.PAYMENT_CHANNEL)
  paymentChannel: keyof typeof Iyzipay.PAYMENT_CHANNEL;

  @IsNumber()
  installments: number;

  @IsString()
  callbackUrl: string;
}
