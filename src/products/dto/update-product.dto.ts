import { PartialType, IntersectionType } from '@nestjs/mapped-types';
import { CreateProductDto } from './create-product.dto';
import { UpdateCategoryProductsDto } from 'src/categories/dto/update-category-products.dto';

export class UpdateProductDto extends IntersectionType(
  PartialType(CreateProductDto),
  UpdateCategoryProductsDto,
) {}
