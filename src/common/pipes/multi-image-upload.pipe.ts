import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { MaxFileSizeValidator, FileTypeValidator } from '@nestjs/common';

@Injectable()
export class FilesValidationPipe implements PipeTransform {
  async transform(
    files: Express.Multer.File[] | undefined,
  ): Promise<Express.Multer.File[] | undefined> {
    if (!files || files.length === 0) {
      return undefined;
    }

    const maxSize = 5 * 1024 * 1024;
    const allowedTypes = /(jpg|jpeg|png|webp)$/;

    const errors: string[] = [];
    const maxSizeValidator = new MaxFileSizeValidator({ maxSize });
    const fileTypeValidator = new FileTypeValidator({ fileType: allowedTypes });

    files.forEach((file) => {
      if (!maxSizeValidator.isValid(file)) {
        errors.push(
          `File ${file.originalname} is too large (max ${maxSize} bytes)`,
        );
      }
      if (!fileTypeValidator.isValid(file)) {
        errors.push(
          `File ${file.originalname} has invalid type (allowed: ${allowedTypes})`,
        );
      }
    });

    if (errors.length > 0) {
      throw new BadRequestException(errors.join('; '));
    }

    return files;
  }
}
