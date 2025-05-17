import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';

export class UploadImageDto {
  @ApiProperty({
    description: 'ID of the product to associate with this image',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsUUID('4', { message: 'Product ID must be a valid UUID v4' })
  productId: string;

  @ApiProperty({
    description: 'Display order of this image',
    example: 1,
  })
  @IsNumber()
  @IsNotEmpty()
  @Transform(({ value }) => parseInt(value, 10))
  displayOrder: number;

  @ApiProperty({
    description: 'Folder path in Cloudinary (optional)',
    example: 'products',
    required: false,
  })
  @IsString()
  @IsOptional()
  @Matches(/^[a-zA-Z0-9_\-/]+$/, {
    message:
      'Folder name can only contain letters, numbers, underscores, hyphens and slashes',
  })
  folder?: string;
}
