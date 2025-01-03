import { Injectable } from '@nestjs/common';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { DrizzleService } from 'src/database/drizzle.service';
import { ProductTable } from 'src/database/schemas';
import {
  ProductImageTable,
  ProductVariantTable,
} from 'src/database/schemas/products.schema';
import { and, eq, gte, inArray, lte, sql } from 'drizzle-orm';
import { CategoriesService } from 'src/categories/categories.service';
import { GetProductsDto } from '../dto/get-products.dto';
import { ProductCategoryTable } from 'src/database/schemas/categories.schema';
import { AbstractCrudService } from 'src/common/services/base-service';
import slugify from 'slugify';

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
    const { variants } = createProductDto;

    const parentProductId = await this.createProduct(createProductDto);

    variants.map((variant) => (variant.parentId = parentProductId));

    if (variants?.length > 0) {
      for (const variant of variants) {
        await this.createProduct(variant);
      }
    }
    return { message: 'Product successfully created' };
  }

  private async createProduct(
    createProductDto: Partial<CreateProductDto>,
  ): Promise<string> {
    const {
      categoryIdOrName,
      attributes,
      isFeatured,
      name,
      price,
      currency,
      description,
      stockQuantity,
      isVariant,
      parentId,
    } = createProductDto;

    const [product] = await this.drizzleService.db
      .insert(ProductTable)
      .values({
        name,
        slug: slugify(name, { lower: true }),
        isFeatured,
        price,
        currency,
        description,
        stockQuantity,
        isVariant: parentId ? true : isVariant,
        parentId,
      })
      .returning({ id: ProductTable.id });

    if (categoryIdOrName) {
      this.categoryService.updateOrCreateCategoryWithProducts(
        categoryIdOrName,
        { productIdsToLink: [product.id], productIdsToUnlink: [] },
      );
    }

    if (attributes?.length > 0) {
      await this.drizzleService.db.insert(ProductVariantTable).values(
        attributes.map((attr) => ({
          productId: product.id,
          variantType: slugify(attr.variantType, { lower: true }),
          value: slugify(attr.value, { lower: true }),
        })),
      );
    }
    return product.id;
  }

  async findOne(productId: string) {
    const [parentProduct] = await this.findOneProduct(productId);

    if (!parentProduct) {
      throw new Error(`Product with id ${productId} not found.`);
    }

    const variants = await this.findOneProduct(productId, true);

    const structuredResponse = {
      product: {
        ...parentProduct.product,
        attributes: parentProduct.attributes ?? [],
        images: parentProduct.images ?? [],
      },
      variants: variants.map((row) => ({
        ...row.product,
        attributes: row.attributes ?? [],
        images: row.images ?? [],
      })),
    };

    return structuredResponse;
  }

  private async findOneProduct(productId: string, isVariant: boolean = false) {
    const product = await this.drizzleService.db
      .select({
        product: ProductTable,
        images: this.getAggregatedImages(),
        attributes: this.getAggregatedAttributes(),
      })
      .from(ProductTable)
      .leftJoin(
        ProductImageTable,
        eq(ProductImageTable.productId, ProductTable.id),
      )
      .leftJoin(
        ProductVariantTable,
        eq(ProductVariantTable.productId, ProductTable.id),
      )
      .where(eq(isVariant ? ProductTable.parentId : ProductTable.id, productId))
      .groupBy(ProductTable.id)
      .execute();

    return product;
  }

  async findAll(getProductsDto: GetProductsDto): Promise<PaginatedResult<any>> {
    const { variants } = getProductsDto;

    let query = this.drizzleService.db
      .select({
        product: ProductTable,
        ...(variants?.length > 0 && {
          attributes: this.getAggregatedAttributes(),
        }),
      })
      .from(ProductTable)
      .$dynamic();

    if (variants?.length > 0) {
      query = query.groupBy(ProductTable.id);
    }

    return await this.getPaginatedResult(getProductsDto, query);
  }

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
        eq(ProductVariantTable.productId, ProductTable.id),
      );
      variants.forEach(({ type, value }) => {
        query = query.where(
          and(
            eq(ProductVariantTable.variantType, type),
            eq(ProductVariantTable.value, value),
          ),
        );
      });
      query = query.groupBy(ProductTable.id);
    }

    return query;
  }

  private async resolveCategoryId(slug: string): Promise<string | null> {
    const category = await this.drizzleService.db.query.categories.findFirst({
      where: (categories, { eq }) => eq(categories.slug, slug),
    });

    if (!category) {
      throw new Error(`Category with slug '${slug}' not found.`);
    }

    return category.id;
  }
  async update(id: string, updateProductDto: UpdateProductDto) {
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

  async delete(id: string) {
    const product = await this.findOne(id);

    if (product.variants.length > 0) {
      await this.drizzleService.db
        .delete(ProductTable)
        .where(
          inArray(ProductTable.id, [
            id,
            ...product.variants.map((variant) => variant.id),
          ]),
        )
        .execute();
    }

    await this.drizzleService.db
      .delete(ProductTable)
      .where(eq(ProductTable.id, id))
      .execute();

    return `This action removed${id} product and its variants`;
  }

  private getAggregatedImages() {
    return sql`array_agg(
      jsonb_build_object('id', ${ProductImageTable.id}, 'url', ${ProductImageTable.url})
      ) FILTER (WHERE ${ProductImageTable.id} IS NOT NULL)`.as('images');
  }

  private getAggregatedAttributes() {
    return sql`array_agg(
      jsonb_build_object('id', ${ProductVariantTable.id}, 'variantType', ${ProductVariantTable.variantType}, 'value', ${ProductVariantTable.value})
      ) FILTER (WHERE ${ProductVariantTable.id} IS NOT NULL)`.as('attributes');
  }
}
