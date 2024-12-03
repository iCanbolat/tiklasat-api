import { IsUUID, IsArray, ArrayUnique, IsOptional } from 'class-validator';

export class UpdateCategoryProductsDto {
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  @IsOptional()
  productIdsToLink?: string[];

  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  @IsOptional()
  productIdsToUnlink?: string[];
}
