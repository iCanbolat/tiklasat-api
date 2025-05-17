import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { UploadImageDto } from '../dto/upload-image.dto';

@Injectable()
export class CloudinaryUploadValidationPipe implements PipeTransform {
  transform(value: UploadImageDto): UploadImageDto {
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value.productId,
      )
    ) {
      throw new BadRequestException(
        'Invalid product ID format. Must be a valid UUID v4',
      );
    }

    if (value.folder && !/^[a-zA-Z0-9_\-/]+$/.test(value.folder)) {
      throw new BadRequestException(
        'Folder name can only contain letters, numbers, underscores, hyphens and slashes',
      );
    }

    return value;
  }
}
