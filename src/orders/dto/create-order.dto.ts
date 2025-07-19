import {
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  OrderStatus,
  OrderStatusType,
} from 'src/database/schemas/orders.schema';

export class CreateOrderDto {
  @IsOptional()
  customer?: { id: string; type: 'user' | 'guest' };

  @IsEnum(OrderStatus)
  @IsOptional()
  status?: OrderStatusType;

  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ValidateNested({ each: true })
  @IsUUID()
  @IsOptional()
  addressIds?: string[];
}

export class OrderItemDto {
  @IsInt()
  quantity: number;

  @IsUUID()
  productId: string;
}
