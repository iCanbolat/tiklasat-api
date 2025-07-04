import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class ParseProductImagesInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();

    const { imageUrls, displayOrders, cloudinaryIds } = req.body;
    const files: Express.Multer.File[] = req.files || [];

    if (imageUrls && displayOrders) {
      const urls = Array.isArray(imageUrls) ? imageUrls.flat() : [imageUrls];
      const orders = Array.isArray(displayOrders)
        ? displayOrders.flat()
        : [displayOrders];
      const cloudinary = Array.isArray(cloudinaryIds)
        ? cloudinaryIds
        : cloudinaryIds
          ? [cloudinaryIds]
          : [];

      let fileIndex = 0;
      let cloudinaryIndex = 0;

      req.body.images = urls.map((url: string, index: number) => {
        const isBlob = url.startsWith('blob:');
        const image: Record<string, any> = {
          displayOrder: Number(orders[index]),
        };

        if (isBlob && files[fileIndex]) {
          image.file = files[fileIndex++];
        }

        if (!isBlob) {
          image.url = url;
          image.cloudinaryId = cloudinary[cloudinaryIndex++] ?? undefined;
        }

        return image;
      });

      delete req.body.imageUrls;
      delete req.body.displayOrders;
      delete req.body.cloudinaryIds;
    }

    return next.handle();
  }
}
