import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
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
  MinLength,
  IsPositive,
  MaxLength,
} from 'class-validator';
import {
  CurrencyEnum,
  CurrencyType,
  ProductStatusEnum,
  ProductStatusType,
} from 'src/database/schemas/products.schema';

class ImageDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  file?: any;

  @IsOptional()
  @IsString()
  url?: string;

  @ApiProperty({
    description: 'Display order of this image',
    example: 1,
  })
  @IsNumber()
  @IsNotEmpty()
  @Transform(({ value }) => parseInt(value, 10))
  displayOrder: number;

  @IsOptional()
  @IsString()
  cloudinaryId?: string;
}

class AttributeDto {
  @IsString()
  @Transform(({ value }) =>
    typeof value === 'string' ? value : JSON.parse(value).id,
  )
  id: string;

  @IsString()
  @Transform(({ value }) =>
    typeof value === 'string' ? value : JSON.parse(value).variantType,
  )
  variantType: string;

  @IsString()
  @Transform(({ value }) =>
    typeof value === 'string' ? value : JSON.parse(value).value,
  )
  value: string;
}

class CategoryDto {
  @IsString()
  @Transform(({ value }) =>
    typeof value === 'string' ? value : JSON.parse(value).id,
  )
  id: string;

  @IsString()
  @Transform(({ value }) =>
    typeof value === 'string' ? value : JSON.parse(value).name,
  )
  name: string;
}

export class CreateProductDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  @MinLength(2)
  slug: string;

  @IsOptional()
  @IsString()
  @MinLength(7)
  description: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  sku: string;

  @IsOptional()
  @IsEnum(CurrencyEnum.Enum)
  @Transform(({ value }) => value as CurrencyType)
  currency?: CurrencyType;

  // Image metadata (separate from files)
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @Transform(({ value }) =>
    Array.isArray(value) ? value.flat(Infinity) : [value],
  )
  @IsArray()
  @IsString({ each: true })
  imageUrls?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  cloudinaryIds?: string[];

  @ApiPropertyOptional({ type: [String] })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  relatedProductsToAdd?: string[];

  @ApiPropertyOptional({ type: [String] })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  relatedProductsToRemove?: string[];

  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Transform(({ value }) =>
    Array.isArray(value) ? value.map((v) => parseInt(v, 10)) : [],
  )
  displayOrders?: number[];
  ///////

  @ApiProperty({
    description: 'Price of this product',
    example: 1,
  })
  @IsNumber()
  @IsNotEmpty()
  @Transform(({ value }) => parseFloat(value))
  @IsPositive()
  price: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Transform(({ value }) => parseFloat(value))
  cost?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImageDto)
  images?: ImageDto[];

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CategoryDto)
  @Transform(({ value }) => JSON.parse(value))
  category?: CategoryDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttributeDto)
  @Transform(({ value }) => JSON.parse(value))
  attributes?: AttributeDto[];

  @IsEnum(ProductStatusEnum.Enum)
  @Transform(({ value }) => value as ProductStatusType)
  status: ProductStatusType;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  isFeatured?: boolean;

  @IsNumber()
  @IsInt()
  @Min(0)
  @Transform(({ value }) => parseInt(value, 10))
  stockQuantity: number;

  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  manageStock: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  allowBackorders?: boolean;

  @IsOptional()
  @IsNumber()
  @IsInt()
  @Min(0)
  @Transform(({ value }) => parseInt(value, 10))
  stockUnderThreshold?: number;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  metaTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  metaDescription?: string;

  @IsOptional()
  @IsString()
  metaKeywords?: string;
}
