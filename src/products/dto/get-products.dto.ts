import { IsOptional, IsNumber, IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class Variant {
  @IsString()
  type: string;

  @IsString()
  value: string;
}

export class GetProductsDto {
  @IsOptional()
  @IsString()
  categorySlug?: string; // Category slug as a string

  @IsOptional()
  @Type(() => Number) // Transform to a number
  @IsNumber()
  minPrice?: number;

  @IsOptional()
  @Type(() => Number) // Transform to a number
  @IsNumber()
  maxPrice?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true }) // Validate each object in the array
  @Type(() => Variant) // Transform array items into Variant instances
  variants?: Variant[];

  @IsOptional()
  @Type(() => Number) // Transform to a number
  @IsNumber()
  page?: number; // Page number for pagination

  @IsOptional()
  @Type(() => Number) // Transform to a number
  @IsNumber()
  pageSize?: number; // Number of items per page
}
