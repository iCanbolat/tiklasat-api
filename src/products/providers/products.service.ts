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
import { and, eq, gte, ilike, inArray, lte, or, sql, SQL } from 'drizzle-orm';
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
import { PgSelectBase, PgTable } from 'drizzle-orm/pg-core';
import { ICategory } from 'src/categories/interfaces';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { ProductCreateSaga } from '../sagas/product-create.saga';

@Injectable()
export class ProductsService extends AbstractCrudService<typeof ProductTable> {
  constructor(
    drizzleService: DrizzleService,
    private readonly categoryService: CategoriesService,
    private readonly sagaOrchestrator: ProductCreateSaga,

    private readonly cloudinaryImageService: CloudinaryService,
  ) {
    super(drizzleService, ProductTable);
  }

  async create(
    createProductDto: CreateProductDto,
    files: Express.Multer.File[],
  ): Promise<ProductResponseDto> {
    const sagaResult = await this.sagaOrchestrator.execute(
      createProductDto,
      files,
    );

    let response: ProductResponseDto = {
      product: {
        ...sagaResult.product,
        attributes: sagaResult.attributes ?? [],
        images: sagaResult.images ?? [],
        category: [sagaResult.category],
      },
    };

    if (createProductDto.parentId) {
      const product = await this.findOne(createProductDto.parentId, {
        includeVariant: true,
      });
      response = product;
    }

    console.log('resnponse', response);

    return response;
  }

  // private async createProduct(
  //   createProductDto: Partial<CreateProductDto>,
  // ): Promise<any> {
  //   const {
  //     // category,
  //     // attributes,
  //     isFeatured,
  //     name,
  //     price,
  //     status,
  //     sku,
  //     stockUnderThreshold,
  //     currency,
  //     description,
  //     stockQuantity,
  //     // isVariant,
  //     parentId,
  //     images,
  //   } = createProductDto;

  //   return await this.drizzleService.db
  //     .insert(ProductTable)
  //     .values({
  //       name,
  //       slug: slugify(name, { lower: true }),
  //       isFeatured,
  //       price,
  //       currency,
  //       status,
  //       sku,
  //       stockUnderThreshold,
  //       description,
  //       stockQuantity,
  //       // isVariant: parentId ? true : isVariant,
  //       parentId,
  //     })
  //     .returning()
  //     .then((rows) => rows[0]);

  //   // if (category) {
  //   //   this.categoryService.updateOrCreateCategoryWithProducts(category.id, {
  //   //     productIdsToLink: [product.id],
  //   //     productIdsToUnlink: [],
  //   //   });
  //   // }

  //   // if (attributes?.length > 0) {
  //   //   await this.drizzleService.db.insert(ProductVariantTable).values(
  //   //     attributes.map((attr) => ({
  //   //       productId: product.id,
  //   //       variantType: slugify(attr.variantType, { lower: true }),
  //   //       value: slugify(attr.value, { lower: true }),
  //   //     })),
  //   //   );
  //   // }
  //   // return { product, attributes };
  // }

  async findOne(
    productId: string,
    options?: {
      includeVariant?: boolean;
      select?: { product?: Partial<Record<keyof IProduct, boolean>> };
    },
  ): Promise<ProductResponseDto> {
    const [response] = await this.findOneProduct(
      productId,
      false,
      options?.select ?? {},
    );

    if (!response) {
      throw new Error(`Product with id ${productId} not found.`);
    }

    const relatedProducts = await this.drizzleService.db.query.relatedProducts
      .findMany({
        where: (rp) => eq(rp.productId, response.product.id),
        with: {
          targetProduct: {
            columns: {
              id: true,
              name: true,
              stockQuantity: true,
              price: true,
              isFeatured: true,
              status: true,
              sku: true,
            },
            with: {
              categories: {
                with: {
                  category: {
                    columns: { id: true, name: true, slug: true },
                  },
                },
              },
              images: true,
            },
          },
        },
      })
      .then((rows) =>
        rows.map((row) => ({
          ...row.targetProduct,
          categories: row.targetProduct.categories.map((pc) => pc.category),
        })),
      );

    if (options?.includeVariant) {
      const variants = await this.findOneProduct(productId, true, {
        product: {
          id: true,
          name: true,
          sku: true,
          price: true,
          stockQuantity: true,
        },
      });

      const structuredResponse = {
        product: {
          ...response.product,
          attributes: response.attributes ?? [],
          images: response.images ?? [],
          category: response.category,
        },
        variants: variants?.map((row) => ({
          ...row.product,
          attributes: row.attributes ?? [],
          images: row.images ?? [],
        })),
        relatedProducts,
      };

      return structuredResponse;
    }

    return {
      product: {
        ...response.product,
        attributes: response.attributes ?? [],
        images: response.images ?? [],
        category: response.category,
      },
      relatedProducts,
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
        category: this.getCategorySelect() as unknown as SQL.Aliased<
          ICategory[]
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
        attributes: this.getAttributeSelect(),
        images: this.getImageSelect(),
        category: this.getCategorySelect(),
      })
      .from(ProductTable)
      .leftJoin(
        ProductImageTable,
        eq(ProductImageTable.productId, ProductTable.id),
      )
      .leftJoin(
        ProductCategoryTable,
        eq(ProductCategoryTable.productId, ProductTable.id),
      )
      .leftJoin(
        CategoryTable,
        eq(ProductCategoryTable.categoryId, CategoryTable.id),
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

    return {
      data: paginatedResults.data,
      pagination: paginatedResults.pagination,
    };
  }

  protected applyPaginateJoins?(query: PgSelectBase<any, any, any>) {
    return query
      .leftJoin(
        ProductCategoryTable,
        eq(ProductTable.id, ProductCategoryTable.productId),
      )
      .leftJoin(
        CategoryTable,
        eq(ProductCategoryTable.categoryId, CategoryTable.id),
      )
      .leftJoin(
        ProductVariantTable,
        eq(ProductTable.id, ProductVariantTable.productId),
      );
  }

  protected async applyFilters(query: any, filters: GetProductsDto) {
    const { categorySlug, minPrice, maxPrice, attributes, status } = filters;

    const conditions = [];

    if (filters.search) {
      conditions.push(
        or(
          ilike(ProductTable.name, `%${filters.search}%`),
          ilike(ProductTable.sku, `%${filters.search}%`),
        ),
      );
    }

    if (categorySlug?.length > 0) {
      console.log(categorySlug);
      conditions.push(inArray(CategoryTable.slug, categorySlug));
    }

    if (minPrice !== undefined) {
      conditions.push(gte(ProductTable.price, minPrice));
    }

    if (maxPrice !== undefined) {
      conditions.push(lte(ProductTable.price, maxPrice));
    }

    if (status?.length > 0) {
      conditions.push(inArray(ProductTable.status, status));
    }

    if (attributes?.length > 0) {
      for (const { type, value } of attributes) {
        conditions.push(
          and(
            eq(ProductVariantTable.variantType, type),
            eq(ProductVariantTable.value, value),
          ),
        );
      }
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    return query;
  }

  async update(
    dto: UpdateProductDto | UpdateProductDto[],
  ): Promise<ProductResponseDto | ProductResponseDto[]> {
    if (Array.isArray(dto)) {
      const results = await Promise.all(
        dto.map((item) => this.updateSingle(item.id, item)),
      );
      return results;
    }

    return this.updateSingle(dto.id, dto);
  }

  async updateSingle(
    id: string,
    updateProductDto: UpdateProductDto,
  ): Promise<ProductResponseDto> {
    const {
      category,
      productIdsToLink,
      productIdsToUnlink,
      images,
      imagesToDelete,
      ...rest
    } = updateProductDto;

    const existingProduct =
      await this.drizzleService.db.query.products.findFirst({
        where: (products, { eq }) => eq(products.id, id),
      });

    if (!existingProduct) {
      throw new Error('Product not found.');
    }

    await this.drizzleService.db.transaction(async (tx) => {
      await tx
        .update(ProductTable)
        .set({
          ...rest,
        })
        .where(eq(ProductTable.id, id))
        .returning();

      if (category) {
        await this.categoryService.updateOrCreateCategoryWithProducts(
          category.id,
          {
            productIdsToLink,
            productIdsToUnlink,
          },
        );
      }

      if (imagesToDelete?.length > 0) {
        await tx
          .delete(ProductImageTable)
          .where(inArray(ProductImageTable.cloudinaryId, imagesToDelete));
      }

      if (images?.length > 0) {
        for (const img of images) {
          if (img.file) {
            const uploads = images
              .filter((image) => image.file)
              .map((image) => {
                return this.cloudinaryImageService.uploadProductImage(
                  image.file,
                  id,
                  image.displayOrder,
                  'products',
                );
              });

            await Promise.all(uploads);
          } else {
            await tx
              .update(ProductImageTable)
              .set({
                displayOrder: img.displayOrder,
                cloudinaryId: img.cloudinaryId,
              })
              .where(eq(ProductImageTable.cloudinaryId, img.cloudinaryId));
          }
        }
      }
    });

    const product = await this.findOne(id);

    return product;
  }

  async delete(ids: string | string[]) {
    const idArray = Array.isArray(ids) ? ids : [ids];

    const allIdsToDelete = new Set<string>();

    for (const id of idArray) {
      const product = await this.findOne(id, { includeVariant: true });

      allIdsToDelete.add(id);
      product.variants.forEach((variant) => allIdsToDelete.add(variant.id));
    }

    await this.drizzleService.db
      .delete(ProductTable)
      .where(inArray(ProductTable.id, Array.from(allIdsToDelete)))
      .execute();

    return `Deleted products: ${Array.from(allIdsToDelete).join(', ')}`;
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
      (
        SELECT jsonb_agg(image_obj ORDER BY image_obj->>'displayOrder')
        FROM (
          SELECT jsonb_build_object(
            'id', ${ProductImageTable.id},
            'url', ${ProductImageTable.url},
            'cloudinaryId', ${ProductImageTable.cloudinaryId},
            'displayOrder', ${ProductImageTable.displayOrder}
          ) AS image_obj
          FROM ${ProductImageTable}
          WHERE ${ProductImageTable.productId} = ${ProductTable.id}
        ) images
      ),
      '[]'
    )
  `.as('images');
  };

  private getCategorySelect = () => {
    return sql`
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', c.id,
            'name', c.name,
            'slug', c.slug
          )
        )
        FROM ${CategoryTable} c
        JOIN ${ProductCategoryTable} pc
          ON pc.category_id = c.id
        WHERE pc.product_id = ${ProductTable.id}
      ),
      '[]'::jsonb
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
