import { Injectable } from '@nestjs/common';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { DrizzleService } from 'src/database/drizzle.service';
import { ProductTable } from 'src/database/schemas';
import { ProductVariantTable } from 'src/database/schemas/products.schema';
import { and, eq, gte, lte } from 'drizzle-orm';
import { CategoriesService } from 'src/categories/categories.service';
import slugify from 'slugify';
import { GetProductsDto } from '../dto/get-products.dto';
import { ProductCategoryTable } from 'src/database/schemas/categories.schema';
import { PgSelect } from 'drizzle-orm/pg-core';
import { AbstractCrudService } from 'src/common/services/base-service';

type PaginatedResult<T> = {
  data: T[];
  pagination: {
    totalRecords: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
};

@Injectable()
export class ProductsService extends AbstractCrudService<typeof ProductTable> {
  constructor(
    drizzleService: DrizzleService,
    private readonly categoryService: CategoriesService,
  ) {
    super(drizzleService, ProductTable);
  }

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

  async findAll(getProductsDto: GetProductsDto): Promise<PaginatedResult<any>> {
    const { variants } = getProductsDto;

    const query = this.drizzleService.db
      .select({
        product: ProductTable,
        ...(variants?.length > 0 && { variants: ProductVariantTable }),
      })
      .from(ProductTable)
      .groupBy(ProductTable.id, variants?.length > 0 && ProductVariantTable.id)
      .$dynamic();

    return await this.getPaginatedResult<typeof query>(getProductsDto, query);
  }

  // async getProducts(filters: GetProductsDto) {
  //   const { page = 1, pageSize = 10 } = filters;

  //   const query = this.drizzleService.db
  //     .select({
  //       product: ProductTable,
  //       ...(filters.variants?.length > 0 && { variants: ProductVariantTable }),
  //     })
  //     .from(ProductTable)
  //     .groupBy(
  //       ProductTable.id,
  //       filters.variants?.length > 0 && ProductVariantTable.id,
  //     )
  //     .$dynamic();

  //   return await this.findAll<typeof query>(filters, { page, pageSize }, query);
  // }

  protected async applyFilters(query: any, filters: GetProductsDto) {
    const { categorySlug, minPrice, maxPrice, variants } = filters;

    if (categorySlug) {
      const categoryId = await this.resolveCategoryId(categorySlug);
      query = query
        .innerJoin(
          ProductCategoryTable,
          eq(ProductTable.id, ProductCategoryTable.productId),
        )
        .where(eq(ProductCategoryTable.categoryId, categoryId));
    }

    if (minPrice) {
      query = query.where(gte(ProductTable.price, minPrice));
    }
    if (maxPrice) {
      query = query.where(lte(ProductTable.price, maxPrice));
    }

    if (variants?.length > 0) {
      query = query.innerJoin(
        ProductVariantTable,
        eq(ProductTable.id, ProductVariantTable.productId),
      );
      variants.forEach(({ type, value }) => {
        query = query.where(
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

  async updateProduct(id: string, updateProductDto: UpdateProductDto) {
    const {
      description,
      isFeatured,
      name,
      price,
      stockQuantity,
      categoryIdOrName,
      productIdsToUnlink,
      productIdsToLink,
    } = updateProductDto;

    const existingProduct =
      await this.drizzleService.db.query.products.findFirst({
        where: (products, { eq }) => eq(products.id, id),
      });

    if (!existingProduct) {
      throw Error('Product not found.');
    }

    if (categoryIdOrName) {
      this.categoryService.updateOrCreateCategoryWithProducts(
        categoryIdOrName,
        { productIdsToLink, productIdsToUnlink },
      );
    }

    const [updatedCategory] = await this.drizzleService.db
      .update(ProductTable)
      .set({
        description,
        isFeatured,
        name,
        slug: slugify(name, { lower: true }),
        price,
        stockQuantity,
      })
      .where(eq(ProductTable.id, id))
      .returning();

    return updatedCategory;
  }

  async removeProduct(id: string) {
    const existingProduct =
      await this.drizzleService.db.query.products.findFirst({
        where: (products, { eq }) => eq(products.id, id),
      });

    if (!existingProduct) {
      throw Error('Product not found.');
    }

    await this.drizzleService.db
      .delete(ProductTable)
      .where(eq(ProductTable.id, id))
      .execute();

    return `This action removed${id} product`;
  }
}
