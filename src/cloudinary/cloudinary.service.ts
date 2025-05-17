import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { DrizzleService } from 'src/database/drizzle.service';
import { ProductImageTable } from 'src/database/schemas/products.schema';
import { Readable } from 'stream';

@Injectable()
export class CloudinaryService {
  constructor(
    @Inject('CLOUDINARY') private cloudinaryClient: typeof cloudinary,
    private readonly drizzleService: DrizzleService,
  ) {}

  async uploadProductImage(
    file: Express.Multer.File,
    productId: string,
    displayOrder: number,
    folder?: string,
  ): Promise<{ url: string; cloudinaryId: string; displayOrder: number }> {
    const product = await this.drizzleService.db.query.products.findFirst({
      where: (products, { eq }) => eq(products.id, productId),
    });

    if (!product) {
      throw new BadRequestException('Product not found');
    }

    const uploadResult: { url: string; public_id: string } = await new Promise(
      (resolve, reject) => {
        const uploadOptions: any = { resource_type: 'auto' };
        if (folder) uploadOptions.folder = folder;

        const uploadStream = this.cloudinaryClient.uploader.upload_stream(
          uploadOptions,
          (error, result) => {
            if (error) return reject(error);
            resolve({
              url: result.secure_url,
              public_id: result.public_id,
            });
          },
        );

        const bufferStream = new Readable();
        bufferStream.push(file.buffer);
        bufferStream.push(null);
        bufferStream.pipe(uploadStream);
      },
    );

    await this.drizzleService.db.insert(ProductImageTable).values({
      url: uploadResult.url,
      cloudinaryId: uploadResult.public_id,
      displayOrder,
      productId,
    });

    return {
      url: uploadResult.url,
      cloudinaryId: uploadResult.public_id,
      displayOrder,
    };
  }

  remove(id: number) {
    return `This action removes a #${id} cloudinary`;
  }
}
