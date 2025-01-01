import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsEnum,
  IsBoolean,
  IsInt,
  Min,
  IsArray,
  ValidateNested,
} from 'class-validator';
import {
  CurrencyEnum,
  CurrencyType,
} from 'src/database/schemas/products.schema';

export class VariantDto {
  @IsString()
  variantType: string;

  @IsString()
  value: string;
}

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  categoryIdOrName?: string;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price: number;

  @IsEnum(CurrencyEnum.Enum)
  @IsOptional()
  currency?: CurrencyType;

  @IsOptional()
  @IsInt()
  @Min(0)
  stockQuantity?: number;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;
  
  @IsBoolean()
  @IsOptional()
  isVariant: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantDto)
  attributes?: VariantDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductDto)
  variants?: CreateProductDto[];
}
