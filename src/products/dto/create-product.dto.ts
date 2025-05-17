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
  ProductStatusEnum,
  ProductStatusType,
} from 'src/database/schemas/products.schema';

export class AttributeDto {
  @IsString()
  variantType: string;

  @IsString()
  value: string;
}

export class ImageDto {
  @IsString()
  url: string;

  @IsString()
  cloudinaryId: string;

  @IsString()
  displayOrder: number;
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
  categoryName?: string;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @IsString()
  metaTitle?: string;

  @IsOptional()
  @IsString()
  metaDescription: string;

  @IsOptional()
  @IsString()
  metaKeywords: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price: number;

  @IsEnum(CurrencyEnum.Enum)
  @IsOptional()
  currency?: CurrencyType;

  @IsEnum(ProductStatusEnum.Enum)
  @IsOptional()
  status?: ProductStatusType;

  @IsOptional()
  @IsInt()
  @Min(0)
  stockQuantity?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  stockUnderThreshold?: number;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @IsBoolean()
  @IsOptional()
  isVariant: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttributeDto)
  attributes?: AttributeDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImageDto)
  images?: ImageDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductDto)
  variants?: CreateProductDto[];
}
