import { PartialType, IntersectionType } from '@nestjs/mapped-types';
import { CreateProductDto } from './create-product.dto';
import { UpdateCategoryProductsDto } from 'src/categories/dto/update-category-products.dto';
import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateProductBaseDto extends IntersectionType(
  PartialType(CreateProductDto),
  PartialType(UpdateCategoryProductsDto),
) {}

export class UpdateProductDto extends UpdateProductBaseDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imagesToDelete?: string[];
}
