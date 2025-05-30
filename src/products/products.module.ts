import { Module } from '@nestjs/common';
import { ProductsService } from './providers/products.service';
import { ProductsController } from './controllers/products.controller';
import { CategoriesModule } from 'src/categories/categories.module';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';
import { ProductCreateSaga } from './sagas/product-create.saga';

@Module({
  imports: [CategoriesModule, CloudinaryModule],
  controllers: [ProductsController],
  providers: [ProductsService, ProductCreateSaga],
  exports: [ProductsService],
})
export class ProductsModule {}
