import {
  IsString,
  IsOptional,
  IsUUID,
  IsBoolean,
  IsInt,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @MinLength(2, { message: 'Category name must be at least 2 characters' })
  @MaxLength(50, { message: 'Category name must be less than 50 characters' })
  name: string;

  @IsString()
  @MinLength(2, { message: 'Slug must be at least 2 characters' })
  @MaxLength(50, { message: 'Slug must be less than 50 characters' })
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug can only contain lowercase letters, numbers, and hyphens',
  })
  slug: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Description must be less than 500 characters' })
  description?: string;

  @IsOptional()
  @IsUUID()
  parentId?: string | null;

  @IsBoolean()
  isActive: boolean;

  @IsBoolean()
  isFeatured: boolean;

  @IsOptional()
  @IsString()
  imageUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(60, { message: 'Meta title must be less than 60 characters' })
  metaTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160, {
    message: 'Meta description must be less than 160 characters',
  })
  metaDescription?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'Meta keywords must be less than 200 characters' })
  metaKeywords?: string;

  @IsInt({ message: 'Display order must be an integer' })
  displayOrder: number;

  @IsOptional()
  @IsString()
  banner?: string | null;
}
