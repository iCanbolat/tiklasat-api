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

  @IsNumber()
  price?: number;

  @IsNumber()
  stockQuantity: number;
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

  @ApiProperty({
    description: 'Base Price of the product',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price: number;

  @IsEnum(CurrencyEnum.Enum)
  @IsOptional()
  currency?: CurrencyType;

  @IsInt()
  @Min(0)
  @IsOptional()
  stockQuantity?: number;

  @IsBoolean()
  @IsOptional()
  isFeatured: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantDto)
  variants: VariantDto[];
}
