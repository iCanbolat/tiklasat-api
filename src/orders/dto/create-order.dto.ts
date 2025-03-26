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
  OrderStatusEnum,
  OrderStatusType,
} from 'src/database/schemas/orders.schema';

export class ProductImagesDto {
  @IsString()
  url: string;
}

export class ProductAttributesDto {
  @IsString()
  variantType: string;

  @IsString()
  value: string;
}

export class ProductDto {
  @IsUUID()
  id: string;

  @IsString()
  name: string;

  @IsString()
  slug: string;

  @IsNumber()
  price: number;

  @IsString()
  currency: string;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsInt()
  stockQuantity: number;

  @IsString()
  description: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductAttributesDto)
  attributes: ProductAttributesDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductImagesDto)
  images: ProductImagesDto[];
}

export class CreateOrderDto {
  @IsUUID()
  // @IsOptional()
  customer: { id: string; type: 'user' | 'guest' };

  @IsEnum(OrderStatusEnum.enumValues)
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

  @ValidateNested()
  @Type(() => ProductDto)
  product: ProductDto;
}
