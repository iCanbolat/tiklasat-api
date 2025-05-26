import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { eq } from 'drizzle-orm';
import { PgTransaction } from 'drizzle-orm/pg-core';
import { DrizzleService } from 'src/database/drizzle.service';
import {
  ProductImageTable,
  ProductTable,
} from 'src/database/schemas/products.schema';
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
    tx?: PgTransaction<any, any, any>,
  ): Promise<{ url: string; cloudinaryId: string; displayOrder: number }> {
    const db = tx || this.drizzleService.db;

    const [product] = await db
      .select()
      .from(ProductTable)
      .where(eq(ProductTable.id, productId))
      .limit(1)
      .execute();

    if (!product) {
      throw new BadRequestException('Product not found');
    }

    return new Promise((resolve, reject) => {
      const uploadOptions: any = {
        resource_type: 'auto',
        folder: folder ? `${folder}/${productId}` : undefined,
      };

      const uploadStream = this.cloudinaryClient.uploader.upload_stream(
        uploadOptions,
        async (error, result) => {
          if (error) return reject(error);

          try {
            const [image] = await db
              .insert(ProductImageTable)
              .values({
                url: result.secure_url,
                cloudinaryId: result.public_id,
                displayOrder,
                productId,
              })
              .returning();

            resolve({
              url: image.url,
              cloudinaryId: image.cloudinaryId,
              displayOrder: image.displayOrder,
            });
          } catch (dbError) {
            await this.cloudinaryClient.uploader.destroy(result.public_id);
            reject(dbError);
          }
        },
      );

      const bufferStream = new Readable();
      bufferStream.push(file.buffer);
      bufferStream.push(null);
      bufferStream.pipe(uploadStream);
    });
  }

  remove(id: number) {
    return `This action removes a #${id} cloudinary`;
  }
}
