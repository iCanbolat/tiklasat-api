import { IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateProductVariantDto {
  @IsString()
  @IsUUID()
  productId: string;
  
  @IsString()
  variantType: string;

  @IsString()
  value: string;

  @IsNumber()
  @IsOptional()
  price?: number;

  @IsNumber()
  @IsOptional()
  stockQuantity?: number;
}
