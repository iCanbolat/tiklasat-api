import { Injectable } from '@nestjs/common';
import { DrizzleService } from 'src/database/drizzle.service';
import { ProductVariantTable } from 'src/database/schemas/products.schema';
import { eq } from 'drizzle-orm';
import { UpdateProductVariantDto } from '../dto/update-product-variant.dto';
import { CreateProductVariantDto } from '../dto/create-product-variant.dto';
import { ReviewTable, UserTable } from 'src/database/schemas';

@Injectable()
export class ProductVariantService {
  constructor(private readonly drizzleService: DrizzleService) {}

  async getProductVariant(id: string, include?: boolean) {
    const query = this.drizzleService.db
      .select()
      .from(ProductVariantTable)
      .where(eq(ProductVariantTable.id, id))
      .$dynamic();

    if (include) {
      query
        .leftJoin(
          ReviewTable,
          eq(ProductVariantTable.id, ReviewTable.productVariantId),
        )
        .leftJoin(UserTable, eq(UserTable.id, ReviewTable.userId));
    }

    if (!query) throw new Error('Product Variant does not exists!');

    return query.execute();
  }

  async createProductVariant(
    productId: string,
    variantDto: CreateProductVariantDto,
  ) {
    const { stockQuantity, value, variantType, price } = variantDto;

    const product = await this.drizzleService.db.query.products.findFirst({
      where: (products, { eq }) => eq(products.id, productId),
    });

    if (!product) throw new Error('Product does not exists!');

    const [variant] = await this.drizzleService.db
      .insert(ProductVariantTable)
      .values({
        value,
        variantType,
        stockQuantity,
        price,
        productId,
      })
      .returning();

    return variant;
  }

  async updateProductVariant(
    productVariantId: string,
    updateVariantDto: UpdateProductVariantDto,
  ) {
    const { stockQuantity, value, variantType, price } = updateVariantDto;

    await this.getProductVariant(productVariantId);

    const updatedFields: Partial<typeof ProductVariantTable.$inferInsert> = {};

    if (stockQuantity != null) updatedFields.stockQuantity = stockQuantity;
    if (value != null) updatedFields.value = value;
    if (variantType != null) updatedFields.variantType = variantType;
    if (price != null) updatedFields.price = price;

    const [variant] = await this.drizzleService.db
      .update(ProductVariantTable)
      .set(updatedFields)
      .returning();

    return variant;
  }

  async deleteProductVariant(variantId: string) {
    const variant =
      await this.drizzleService.db.query.productVariants.findFirst({
        where: (variant, { eq }) => eq(variant.id, variantId),
      });
    if (!variant) throw new Error('Variant does not exists!');

    await this.drizzleService.db
      .delete(ProductVariantTable)
      .where(eq(ProductVariantTable.id, variantId));

    return {
      message: 'Variant deleted!',
    };
  }
}
