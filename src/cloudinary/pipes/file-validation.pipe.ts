import {
  PipeTransform,
  Injectable,
  BadRequestException,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';

@Injectable()
export class FileValidationPipe implements PipeTransform {
  async transform(file: Express.Multer.File): Promise<Express.Multer.File> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const maxSize = 5 * 1024 * 1024;
    const maxSizeValidator = new MaxFileSizeValidator({
      maxSize: maxSize,
    });
    if (!maxSizeValidator.isValid(file)) {
      throw new BadRequestException(
        `File too large. Maximum size is ${maxSize} bytes . Current ${file.size}`,
      );
    }

    const fileTypeValidator = new FileTypeValidator({
      fileType: /(jpg|jpeg|png|webp)$/,
    });
    if (!fileTypeValidator.isValid(file)) {
      throw new BadRequestException(
        'Only image files (jpg, jpeg, png, webp) are allowed',
      );
    }

    return file;
  }
}
