import {
  IsOptional,
  IsNumber,
  IsString,
  IsArray,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import {
  ProductStatusEnum,
  ProductStatusType,
} from 'src/database/schemas/products.schema';

class AttributeDto {
  @IsString()
  type: string;

  @IsString()
  value: string;
}

export class GetProductsDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString({ each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  categorySlug?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxPrice?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttributeDto)
  attributes?: AttributeDto[];

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  pageSize?: number;

  @IsOptional()
  @IsEnum(ProductStatusEnum.enum, { each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  status?: ProductStatusType[];
}
