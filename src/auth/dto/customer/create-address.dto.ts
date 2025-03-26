import {
  IsUUID,
  IsString,
  IsOptional,
  IsEnum,
  Length,
  IsNotEmpty,
  IsEmail,
  Matches,
} from 'class-validator';

export enum AddressType {
  BILLING = 'billing',
  SHIPPING = 'shipping',
}

export class AddressDto {
  @IsUUID()
  @IsOptional()
  id?: string;

  @IsUUID()
  @IsOptional()
  userId?: string;

  @IsUUID()
  @IsOptional()
  guestId?: string;

  @IsEnum(AddressType)
  @IsNotEmpty()
  addressType: AddressType;

  @IsString()
  @Length(1, 255)
  street: string;

  @IsString()
  @Length(1, 100)
  city: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  state?: string;

  @IsOptional()
  @IsString()
  @Length(1, 20)
  zipCode?: string;

  // @IsEmail()
  // @IsNotEmpty()
  // email?: string;

  // @IsString()
  // @Matches(/^\+?\d{10,15}$/, { message: 'Phone number must be a valid international format (e.g., +1234567890)' })
  // phone?: string;

  @IsString()
  @Length(1, 100)
  country: string;
}
