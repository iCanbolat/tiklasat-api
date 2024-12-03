import { Injectable } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { DrizzleService } from 'src/database/drizzle.service';
import { ProductTable } from 'src/database/schemas';
import { ProductVariantTable } from 'src/database/schemas/products.schema';
import { sql } from 'drizzle-orm';
import { CategoriesService } from 'src/categories/categories.service';
import slugify from 'slugify';

@Injectable()
export class ProductsService {
  constructor(
    private readonly drizzleService: DrizzleService,
    private readonly categoryService: CategoriesService,
  ) {}

  async create(createProductDto: CreateProductDto) {
    const {
      isFeatured,
      name,
      price,
      variants,
      currency,
      description,
      stockQuantity,
      categoryIdOrName,
    } = createProductDto;

    const [product] = await this.drizzleService.db
      .insert(ProductTable)
      .values({
        name,
        slug: slugify(name),
        price,
        isFeatured,
        stockQuantity,
        currency,
        description,
      })
      .returning();

    if (categoryIdOrName) {
      this.categoryService.updateOrCreateCategoryWithProducts(
        categoryIdOrName,
        { productIdsToLink: [product.id], productIdsToUnlink: [] },
      );
    }

    if (variants && variants.length > 0) {
      const variantRecords = variants.map((variant) => ({
        productId: product.id,
        variantType: variant.variantType,
        value: variant.value,
        price: variant.price,
        stockQuantity: variant.stockQuantity,
      }));

      await this.drizzleService.db
        .insert(ProductVariantTable)
        .values(variantRecords);

      const totalStock = variants.reduce((sum, v) => sum + v.stockQuantity, 0);
      await this.drizzleService.db
        .update(ProductTable)
        .set({ stockQuantity: totalStock })
        .where(sql`${ProductTable.id} = ${product.id}`);
    }
    return product;
  }

  findAll() {
    return `This action returns all products`;
  }

  findOne(id: number) {
    return `This action returns a #${id} product`;
  }

  update(id: number, updateProductDto: UpdateProductDto) {
    return `This action updates a #${id} product`;
  }

  remove(id: number) {
    return `This action removes a #${id} product`;
  }
}
