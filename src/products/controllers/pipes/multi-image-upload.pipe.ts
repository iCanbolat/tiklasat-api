import {
  PipeTransform,
  Injectable,
  BadRequestException,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';

@Injectable()
export class FilesValidationPipe implements PipeTransform {
  async transform(
    files: Express.Multer.File[],
  ): Promise<Express.Multer.File[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    const maxSize = 5 * 1024 * 1024;
    const allowedTypes = /(jpg|jpeg|png|webp)$/;

    const maxSizeValidator = new MaxFileSizeValidator({ maxSize });
    const fileTypeValidator = new FileTypeValidator({ fileType: allowedTypes });

    for (const file of files) {
      if (!maxSizeValidator.isValid(file)) {
        throw new BadRequestException(
          `File ${file.originalname} is too large. Maximum size is ${maxSize} bytes. Current size: ${file.size} bytes`,
        );
      }

      if (!fileTypeValidator.isValid(file)) {
        throw new BadRequestException(
          `File ${file.originalname} has invalid type. Only ${allowedTypes} are allowed`,
        );
      }
    }

    return files;
  }
}
