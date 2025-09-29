import { Type, Transform } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsDate,
} from 'class-validator';
import {
  OrderStatus,
  OrderStatusType,
} from 'src/database/schemas/orders.schema';

export class GetOrderDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  pageSize?: number = 10;

  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatusType;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxPrice?: number;

  @IsOptional()
  @Transform(({ value }) => (value ? new Date(value) : undefined))
  @IsDate()
  startDate?: Date;

  @IsOptional()
  @Transform(({ value }) => (value ? new Date(value) : undefined))
  @IsDate()
  endDate?: Date;

  @IsOptional()
  @IsString()
  sortBy?: 'createdAt' | 'totalPrice' | 'status' | 'customerName' = 'createdAt';

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}
