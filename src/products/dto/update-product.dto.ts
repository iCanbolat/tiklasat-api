import { PartialType, IntersectionType } from '@nestjs/mapped-types';
import { CreateProductDto } from './create-product.dto';
import { UpdateCategoryProductsDto } from 'src/categories/dto/update-category-products.dto';
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

// export class UpdateProductDto extends IntersectionType(
//   PartialType(CreateProductDto),
//   UpdateCategoryProductsDto,
// ) {}

export class UpdateProductBaseDto extends IntersectionType(
  PartialType(CreateProductDto),
  PartialType(UpdateCategoryProductsDto),
) {}

export class UpdateProductDto extends UpdateProductBaseDto {
  @IsString()
  @IsNotEmpty()
  id: string;
  
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imagesToDelete?: string[];
}
