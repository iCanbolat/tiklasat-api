import { IsUUID } from 'class-validator';

export class LinkProductToCategoryDto {
  @IsUUID()
  productId: string;

  @IsUUID()
  categoryId: string;
}
