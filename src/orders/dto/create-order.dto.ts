import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OrderStatusEnum, OrderStatusType } from 'src/database/schemas/orders.schema';
// import { BasketItemDto, BuyerDto } from 'src/payments/dto/base-payment.dto';

export class GuestUserDto {
  @IsString()
  name: string;

  @IsString()
  email: string;

  @IsString()
  phone: string;

  @IsString()
  address: string;
}

export class CreateOrderDto {
  @IsUUID()
  @IsOptional()
  userId?: string;

  // @ValidateNested()
  // @Type(() => BuyerDto)
  // @IsOptional()
  // guestUser?: BuyerDto;

  @IsEnum(OrderStatusEnum.enumValues)
  @IsOptional()
  status?: OrderStatusType;

  // @ValidateNested({ each: true })
  // @Type(() => BasketItemDto)
  // items: BasketItemDto[];
}

export class OrderItemDto {
  @IsUUID()
  productId: string;

  @IsOptional()
  @IsString()
  quantity: number;
}
