import { Injectable } from '@nestjs/common';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { GetProductsDto } from '../dto/get-products.dto';
import { ProductTable } from 'src/database/schemas';
import {
  CategoryTable,
  ProductCategoryTable,
} from 'src/database/schemas/categories.schema';
import {
  ProductImageTable,
  ProductVariantTable,
} from 'src/database/schemas/products.schema';
import { and, eq, gte, inArray, lte, sql, SQL } from 'drizzle-orm';
import slugify from 'slugify';
import { CategoriesService } from 'src/categories/categories.service';
import { DrizzleService } from 'src/database/drizzle.service';
import { AbstractCrudService } from 'src/common/services/base-service';
import {
  FindAllProductsReturnDto,
  IProduct,
  IProductAttributes,
  IProductImages,
  ProductResponseDto,
  ProductServiceResponse,
} from '../interfaces';
import { PaginatedResults } from 'src/common/types';
import { PgTable } from 'drizzle-orm/pg-core';

@Injectable()
export class ProductsService extends AbstractCrudService<typeof ProductTable> {
  constructor(
    drizzleService: DrizzleService,
    private readonly categoryService: CategoriesService,
  ) {
    super(drizzleService, ProductTable);
  }

  async create(
    createProductDto: CreateProductDto,
  ): Promise<ProductResponseDto> {
    const { variants } = createProductDto;

    const parentProduct = await this.createProduct(createProductDto);

    let variantProducts = [];

    if (variants?.length > 0) {
      variants.forEach(
        (variant) => (variant.parentId = parentProduct.product.id),
      );

      try {
        const variantResponses = await Promise.all(
          variants.map((variant) => this.createProduct(variant)),
        );
        variantProducts = variantResponses.map((response) => ({
          product: {
            ...response.product,
            attributes: response.attributes ?? [],
            images: response.images ?? [],
          },
        }));
      } catch (error) {
        console.error('Error creating variant products:', error);
        throw new Error('Failed to create all variant products');
      }
    }
    return {
      product: {
        ...parentProduct.product,
        attributes: parentProduct.attributes ?? [],
        images: parentProduct.images ?? [],
      },
      variants: variantProducts,
    };
  }

  private async createProduct(
    createProductDto: Partial<CreateProductDto>,
  ): Promise<ProductServiceResponse> {
    const {
      categoryName,
      attributes,
      isFeatured,
      name,
      price,
      currency,
      description,
      stockQuantity,
      isVariant,
      parentId,
      images,
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
      .returning();

    if (categoryName) {
      this.categoryService.updateOrCreateCategoryWithProducts(categoryName, {
        productIdsToLink: [product.id],
        productIdsToUnlink: [],
      });
    }

    if (images?.length > 0) {
      await this.drizzleService.db.insert(ProductImageTable).values(
        images.map((image) => ({
          productId: product.id,
          url: image.url,
        })),
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
    return { product, attributes, images };
  }

  //Refactor
  async findOne(
    productId: string,
    options?: {
      includeVariant?: boolean;
      select?: { product?: Partial<Record<keyof IProduct, boolean>> };
    },
  ): Promise<ProductResponseDto> {
    const [product] = await this.findOneProduct(
      productId,
      false,
      options?.select ?? {},
    );

    if (!product) {
      throw new Error(`Product with id ${productId} not found.`);
    }

    if (options?.includeVariant) {
      const variants = await this.findOneProduct(productId, true);

      const structuredResponse = {
        product: {
          ...product.product,
          attributes: product.attributes ?? [],
          images: product.images ?? [],
        },
        variants: variants.map((row) => ({
          ...row.product,
          attributes: row.attributes ?? [],
          images: row.images ?? [],
        })),
      };

      return structuredResponse;
    }

    return {
      product: {
        ...product.product,
        attributes: product.attributes ?? [],
        images: product.images ?? [],
      },
    };
  }

  private async findOneProduct(
    productId: string,
    isVariant?: boolean,
    select: { product?: Partial<Record<keyof IProduct, boolean>> } = {},
  ): Promise<ProductServiceResponse[]> {
    const selectedProductFields = this.mapSelectFields(
      ProductTable,
      select.product,
    );

    const product = await this.drizzleService.db
      .select({
        product: selectedProductFields as unknown as SQL.Aliased<IProduct>,
        images: this.getImageSelect() as unknown as SQL.Aliased<
          IProductImages[]
        >,
        attributes: this.getAttributeSelect() as unknown as SQL.Aliased<
          IProductAttributes[]
        >,
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
      .groupBy(ProductTable.id, ProductImageTable.id, ProductVariantTable.id)
      .execute();

    return product;
  }

  async findAll(
    getProductsDto: GetProductsDto,
  ): Promise<PaginatedResults<FindAllProductsReturnDto>> {
    let query = this.drizzleService.db
      .select({
        product: ProductTable,
        attributes: this.getAttributeSelect(),
        images: this.getImageSelect(),
        category: this.getCategorySelect(),
      })
      .from(ProductTable)
      .groupBy(ProductTable.id)
      .$dynamic();

    query = this.applyPaginateJoins(query);

    const paginatedResults = await this.getPaginatedResult(
      getProductsDto,
      query,
    );

    const structuredData: FindAllProductsReturnDto[] =
      paginatedResults.data.map((row) => ({
        product: {
          ...row.product,
          attributes: row.attributes ?? [],
          images: row.images ?? [],
          category: row.category ?? [],
        },
      }));

    return {
      data: structuredData,
      pagination: paginatedResults.pagination,
    };
  }

  protected async applyFilters(query: any, filters: GetProductsDto) {
    const { categorySlug, minPrice, maxPrice, attributes } = filters;

    if (categorySlug?.length > 0) {
      query = query.where(eq(CategoryTable.slug, categorySlug));
    }

    if (minPrice) {
      query = query.where(gte(ProductTable.price, minPrice));
    }
    if (maxPrice) {
      query = query.where(lte(ProductTable.price, maxPrice));
    }

    if (attributes?.length > 0) {
      attributes.forEach(({ type, value }) => {
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

  protected applyPaginateJoins(query: any) {
    query = query
      .leftJoin(
        ProductImageTable,
        eq(ProductImageTable.productId, ProductTable.id),
      )
      .leftJoin(
        ProductVariantTable,
        eq(ProductVariantTable.productId, ProductTable.id),
      )
      .leftJoin(
        ProductCategoryTable,
        eq(ProductCategoryTable.productId, ProductTable.id),
      )
      .leftJoin(
        CategoryTable,
        eq(ProductCategoryTable.categoryId, CategoryTable.id),
      );

    return query;
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
  ): Promise<IProduct> {
    const {
      description,
      isFeatured,
      name,
      price,
      stockQuantity,
      categoryName,
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

    if (categoryName) {
      this.categoryService.updateOrCreateCategoryWithProducts(categoryName, {
        productIdsToLink,
        productIdsToUnlink,
      });
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
  
  private mapSelectFields<T extends PgTable<any>>(
    table: T,
    selectFields?: Partial<Record<keyof IProduct, boolean>>,
  ): Record<string, any> {
    if (!selectFields || Object.keys(selectFields).length === 0) {
      return table;
    }

    return Object.fromEntries(
      Object.entries(selectFields)
        .filter(([_, include]) => include)
        .map(([key]) => [key, table[key as keyof typeof table]]),
    );
  }

  private getImageSelect = () => {
    return sql`
    COALESCE(
      jsonb_agg(
        DISTINCT jsonb_build_object(
          'id', ${ProductImageTable.id},
          'url', ${ProductImageTable.url}
        )
      ) FILTER (WHERE ${ProductImageTable.id} IS NOT NULL),
      '[]'
    )
  `.as('images');
  };

  private getCategorySelect = () => {
    return sql`
    COALESCE(
      jsonb_agg(
        DISTINCT jsonb_build_object(
          'id', ${CategoryTable.id},
          'name', ${CategoryTable.name},
          'slug', ${CategoryTable.slug}
        )
      ) FILTER (WHERE ${CategoryTable.id} IS NOT NULL),
      '{}'
    )
  `.as('category');
  };

  private getAttributeSelect = () => {
    return sql`
    COALESCE(
      jsonb_agg(
        DISTINCT jsonb_build_object(
          'id', ${ProductVariantTable.id},
          'variantType', ${ProductVariantTable.variantType},
          'value', ${ProductVariantTable.value}
        )
      ) FILTER (WHERE ${ProductVariantTable.id} IS NOT NULL),
      '[]'
    )
  `.as('attributes');
  };
}
