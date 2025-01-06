import { Injectable } from '@nestjs/common';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { DrizzleService } from 'src/database/drizzle.service';
import { ProductTable } from 'src/database/schemas';
import {
  ProductImageTable,
  ProductVariantTable,
} from 'src/database/schemas/products.schema';
import { and, eq, gte, inArray, lte, SQL, sql } from 'drizzle-orm';
import { CategoriesService } from 'src/categories/categories.service';
import { GetProductsDto } from '../dto/get-products.dto';
import { ProductCategoryTable } from 'src/database/schemas/categories.schema';
import { AbstractCrudService } from 'src/common/services/base-service';
import slugify from 'slugify';
import {
  FindAllProductsReturnDto,
  IProduct,
  IProductAttributes,
  IProductImages,
  ProductResponseDto,
  ProductServiceResponse,
} from '../interfaces';
import { PaginatedResults } from 'src/common/interfaces';

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

  async findOne(productId: string): Promise<ProductResponseDto> {
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

  private async findOneProduct(
    productId: string,
    isVariant: boolean = false,
  ): Promise<ProductServiceResponse[]> {
    const product = await this.drizzleService.db
      .select({
        product: ProductTable as unknown as SQL.Aliased<IProduct>,
        images: this.getAggregatedImages() as SQL.Aliased<IProductImages[]>,
        attributes: this.getAggregatedAttributes() as SQL.Aliased<
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
      .groupBy(ProductTable.id)
      .execute();

    return product;
  }

  async findAll(
    getProductsDto: GetProductsDto,
  ): Promise<PaginatedResults<FindAllProductsReturnDto>> {
    let query = this.drizzleService.db
      .select({
        product: ProductTable,
        attributes: this.getAggregatedAttributes(),
        images: this.getAggregatedImages(),
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
      .groupBy(ProductTable.id)
      .$dynamic();

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
        },
      }));

    return {
      data: structuredData,
      pagination: paginatedResults.pagination,
    };
  }

  protected async applyFilters(query: any, filters: GetProductsDto) {
    const { categorySlug, minPrice, maxPrice, attributes } = filters;

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

    if (attributes?.length > 0) {
      query = query.innerJoin(
        ProductVariantTable,
        eq(ProductVariantTable.productId, ProductTable.id),
      );
      attributes.forEach(({ type, value }) => {
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
