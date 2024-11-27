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

class VariantDto {
  @ApiProperty({
    description: 'Name of the new product',
    example: 'TV',
  })
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
  @ApiProperty({
    description: 'Name of the new product',
    example: 'TV',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Description of the new product',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Email of the new user',
    example: 'user@example.com',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price: number;

  @IsEnum(CurrencyEnum)
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
