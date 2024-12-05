import { Injectable } from '@nestjs/common';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { DrizzleService } from 'src/database/drizzle.service';
import { ProductTable } from 'src/database/schemas';
import { ProductVariantTable } from 'src/database/schemas/products.schema';
import { and, eq, gte, lte, sql } from 'drizzle-orm';
import { CategoriesService } from 'src/categories/categories.service';
import slugify from 'slugify';
import { GetProductsDto } from '../dto/get-products.dto';
import { ProductCategoryTable } from 'src/database/schemas/categories.schema';
import { PgSelect } from 'drizzle-orm/pg-core';

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
        slug: slugify(name, { lower: true }),
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
        .where(eq(ProductTable.id, product.id));
    }
    return product;
  }

  async getProducts(filters: GetProductsDto) {
    const { categorySlug, page = 1, pageSize = 10, variants } = filters;

    const categoryId = categorySlug
      ? await this.resolveCategoryId(categorySlug)
      : null;

    const query = this.drizzleService.db
      .select({
        product: ProductTable,
        ...(variants?.length > 0 && { variants: ProductVariantTable }),
        totalRecords: sql`COUNT(*) OVER()`.as('total_records'),
      })
      .from(ProductTable)
      .$dynamic();

    this.applyFilters(query, filters, categoryId);

    const offset = (page - 1) * pageSize;
    query.limit(pageSize).offset(offset);

    const products = await query;
    const totalRecords = Number(products[0].totalRecords);

    return {
      data: products,
      pagination: {
        totalRecords: totalRecords,
        page,
        pageSize,
        totalPages: Math.ceil(totalRecords / pageSize),
      },
    };
  }

  private applyFilters<T extends PgSelect>(
    query: T,
    filters: GetProductsDto,
    categoryId: string | null,
  ): T {
    const { minPrice, maxPrice, variants = [] } = filters;

    if (categoryId) {
      query
        .innerJoin(
          ProductCategoryTable,
          eq(ProductTable.id, ProductCategoryTable.productId),
        )
        .where(eq(ProductCategoryTable.categoryId, categoryId));
    }

    if (minPrice) {
      query.where(gte(ProductTable.price, minPrice));
    }
    if (maxPrice) {
      query.where(lte(ProductTable.price, maxPrice));
    }

    if (variants.length > 0) {
      query.innerJoin(
        ProductVariantTable,
        eq(ProductTable.id, ProductVariantTable.productId),
      );
      variants.forEach(({ type, value }) => {
        query.where(
          and(
            eq(ProductVariantTable.variantType, type),
            eq(ProductVariantTable.value, value),
          ),
        );
      });
    }

    return query;
  }

  //TODO: Cache Category via Redis
  private async resolveCategoryId(slug: string): Promise<string | null> {
    const category = await this.drizzleService.db.query.categories.findFirst({
      where: (categories, { eq }) => eq(categories.slug, slug),
    });

    if (!category) {
      throw new Error(`Category with slug '${slug}' not found.`);
    }

    return category.id;
  }

  async getProduct(id: string) {
    return await this.drizzleService.db.query.products.findFirst({
      where: (products, { eq }) => eq(products.id, id),
      with: {
        reviews: {
          with: {
            variant: true,
            user: true,
          },
        },
        variants: true,
      },
    });
  }

  async getProductVariant(id: string) {
    return await this.drizzleService.db.query.productVariants.findFirst({
      where: (products, { eq }) => eq(products.id, id),
      with: {
        reviews: {
          with: {
            variant: true,
            user: true,
          },
        },
      },
    });
  }

  updateProduct(id: string, updateProductDto: UpdateProductDto) {
    return `This action updates a #${id} product`;
  }

  remove(id: number) {
    return `This action removes a #${id} product`;
  }
}
