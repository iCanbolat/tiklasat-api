import { Type } from 'class-transformer';
import { IsOptional, IsNumber, IsString, IsBoolean } from 'class-validator';

export class GetCategoriesDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  pageSize?: number = 10;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional()
  @IsString()
  sortBy?: 'name' | 'createdAt' | 'displayOrder' | 'productsCount' =
    'createdAt';

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}
