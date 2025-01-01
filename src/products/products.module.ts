import { Module } from '@nestjs/common';
import { ProductsService } from './providers/products.service';
import { ProductsController } from './controllers/products.controller';
import { CategoriesModule } from 'src/categories/categories.module';
// import { ProductVariantService } from './providers/product-variant.service';
// import { ProductVariantController } from './controllers/product-variant.controller';

@Module({
  imports: [CategoriesModule],
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}
