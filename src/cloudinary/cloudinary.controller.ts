import {
  Controller,
  Post,
  Body,
  Param,
  Delete,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { CloudinaryService } from './cloudinary.service';

import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation } from '@nestjs/swagger';
import { Public } from 'src/auth/decorators/public.decorator';
import { UploadImageDto } from './dto/upload-image.dto';
import { CloudinaryUploadValidationPipe } from './pipes/cloıdinary-upload.pipe';
import { FileValidationPipe } from './pipes/file-validation.pipe';

@Controller('cloudinary')
export class CloudinaryController {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

  @Public()
  @Post('upload')
  @ApiOperation({ summary: 'Upload product image to Cloudinary' })
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  async uploadImage(
    @UploadedFile(FileValidationPipe) file: Express.Multer.File,
    @Body(CloudinaryUploadValidationPipe) uploadImageDto: UploadImageDto,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    return this.cloudinaryService.uploadProductImage(
      file,
      uploadImageDto.productId,
      uploadImageDto.displayOrder,
      uploadImageDto.folder,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.cloudinaryService.remove(+id);
  }
}
