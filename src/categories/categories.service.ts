import { Injectable } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { DrizzleService } from 'src/database/drizzle.service';
import {
  CategoryTable,
  ProductCategoryTable,
} from 'src/database/schemas/categories.schema';
import { and, eq, inArray, SQL, sql } from 'drizzle-orm';
import { UpdateCategoryProductsDto } from './dto/update-category-products.dto';
import slugify from 'slugify';
import {
  ProductImageTable,
  ProductTable,
} from 'src/database/schemas/products.schema';
import {
  FindOneCategoryResponseDto,
  ICategory,
  ICategoryTree,
  // IProduct,
} from './interfaces';

@Injectable()
export class CategoriesService {
  constructor(private readonly drizzleService: DrizzleService) {}

  async create(createCategoryDto: CreateCategoryDto): Promise<ICategory> {
    const params: typeof CategoryTable.$inferInsert = createCategoryDto;
    if (params.parentId) {
      await this.ensureCategoryExists(params.parentId);
    }

    const [newCategory] = await this.drizzleService.db
      .insert(CategoryTable)
      .values(params)
      .returning();

    return newCategory;
  }

  async updateOrCreateCategoryWithProducts(
    categoryName: string,
    { productIdsToLink, productIdsToUnlink }: UpdateCategoryProductsDto,
  ) {
    const category = await this.findOrCreateCategory(categoryName);

    // if there are parent categories, link the products to them as well
    let categoryIdsToLink = [];
    if (category.parentId) {
      categoryIdsToLink = (
        await this.getParentCategories(category.parentId)
      ).map((category) => category.id);
    }

    if (productIdsToLink && productIdsToLink.length > 0) {
      const links = productIdsToLink.map((productId) => ({
        productId,
        categoryId: category.id,
      }));

      await this.drizzleService.db
        .insert(ProductCategoryTable)
        .values(links)
        .onConflictDoNothing();

      if (categoryIdsToLink.length > 0) {
        productIdsToLink.forEach(async (productId) => {
          await this.linkProductToParentCategory(productId, categoryIdsToLink);
        });
      }
    }

    if (productIdsToUnlink && productIdsToUnlink.length > 0) {
      await this.drizzleService.db
        .delete(ProductCategoryTable)
        .where(
          and(
            eq(ProductCategoryTable.categoryId, category.id),
            inArray(ProductCategoryTable.productId, productIdsToUnlink),
          ),
        );
      if (categoryIdsToLink.length > 0) {
        productIdsToUnlink.forEach(async (productId) => {
          await this.unLinkProductToParentCategory(
            productId,
            categoryIdsToLink,
          );
        });
      }
    }

    return {
      message: 'Category products updated successfully',
      categoryId: category.id,
      linkedProducts: productIdsToLink || [],
      unlinkedProducts: productIdsToUnlink || [],
    };
  }

  async getAllCategories(): Promise<ICategoryTree[]> {
    const categories = await this.drizzleService.db
      .select({
        id: CategoryTable.id,
        name: CategoryTable.name,
        slug: CategoryTable.slug,
        imageUrl: CategoryTable.imageUrl,
        parentId: CategoryTable.parentId,
        isActive: CategoryTable.isActive,
        isFeatured: CategoryTable.isFeatured,
        displayOrder: CategoryTable.displayOrder,
        productsCount: sql<number>`COUNT(${ProductCategoryTable.productId})`.as(
          'productsCount',
        ),
      })
      .from(CategoryTable)
      .leftJoin(
        ProductCategoryTable,
        eq(ProductCategoryTable.categoryId, CategoryTable.id),
      )
      .groupBy(CategoryTable.id)
      .orderBy(sql`${CategoryTable.createdAt} DESC`)
      .execute();

    return this.buildCategoryTree(categories);
  }

  async getCategory(categoryId: string): Promise<FindOneCategoryResponseDto> {
    const [category] = await this.drizzleService.db
      .select({
        category: CategoryTable,
        products: this.getAggregatedProducts() as SQL.Aliased<any[]>,
      })
      .from(CategoryTable)
      .leftJoin(
        ProductCategoryTable,
        eq(CategoryTable.id, ProductCategoryTable.categoryId),
      )
      .leftJoin(
        ProductTable,
        eq(ProductTable.id, ProductCategoryTable.productId),
      )
      .leftJoin(
        ProductImageTable,
        eq(ProductTable.id, ProductImageTable.productId),
      )
      .where(eq(CategoryTable.id, categoryId))
      .groupBy(CategoryTable.id)
      .execute();

    if (!category) {
      throw new Error(`Category with ID ${categoryId} not found.`);
    }

    const parentCategories = await this.getParentCategories(
      category.category.parentId,
    );

    const subCategories = await this.getSubcategories(categoryId);

    return {
      category: category.category,
      products: category.products,
      parentCategories,
      subCategories,
    };
  }

  async removeCategory(categoryId: string, shouldDeleteProducts: boolean) {
    const categoryWithProducts = await this.getCategory(categoryId);

    if (!shouldDeleteProducts) {
      await this.drizzleService.db
        .delete(CategoryTable)
        .where(sql`${CategoryTable.id} = ${categoryId}`);

      return {
        message:
          'Category deleted, but associated products were kept and unlinked',
      };
    }

    const productIds = categoryWithProducts.products?.map((link) => link.id);

    if (productIds?.length > 0) {
      await this.drizzleService.db
        .delete(ProductTable)
        .where(inArray(ProductTable.id, productIds));
    }

    await this.drizzleService.db
      .delete(CategoryTable)
      .where(sql`${CategoryTable.id} = ${categoryId}`);

    return {
      message: 'Category and all associated products deleted successfully',
      deletedProducts: productIds,
    };
  }

  async updateCategory(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<ICategory> {
    const params: Partial<typeof CategoryTable.$inferInsert> =
      updateCategoryDto;

    await this.ensureCategoryExists(id);

    // Ensure the new parentId exists if provided
    if (params.parentId) {
      await this.ensureCategoryExists(params.parentId);
    }

    const [updatedCategory] = await this.drizzleService.db
      .update(CategoryTable)
      .set(params)
      .where(eq(CategoryTable.id, id))
      .returning();

    return updatedCategory;
  }

  private async ensureCategoryExists(categoryId: string) {
    const exists = await this.drizzleService.db.query.categories.findFirst({
      where: (categories, { eq }) => eq(categories.id, categoryId),
    });

    if (!exists) {
      throw new Error(`Category with ID ${categoryId} not found.`);
    }
  }

  private buildCategoryTree(
    categories: ICategory[],
    parentId: string | null = null,
  ): ICategoryTree[] {
    return categories
      .filter((category) => category.parentId === parentId)
      .map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        imageUrl: category.imageUrl,
        productsCount: category.productsCount ?? 0,
        isActive: category.isActive,
        isFeatured: category.isFeatured,
        displayOrder: category.displayOrder,
        subcategories: this.buildCategoryTree(categories, category.id),
      }));
  }

  private async findOrCreateCategory(categoryName: string) {
    const slug = slugify(categoryName, { lower: true });

    const category = await this.drizzleService.db.query.categories.findFirst({
      where: (categories, { eq }) => eq(categories.slug, slug),
    });

    if (category) {
      return category;
    }

    return await this.create({
      name: categoryName,
      imageUrl: '',
      slug,
      isActive: true,
      isFeatured: false,
      displayOrder: 0,
    });
  }

  private async getParentCategories(categoryParentId: string) {
    let categories = [];

    const [query] = await this.drizzleService.db
      .select()
      .from(CategoryTable)
      .where(eq(CategoryTable.id, categoryParentId))
      .execute();

    categories.push(query);

    if (query?.parentId) {
      this.getParentCategories(query.parentId);
    }

    return categories;
  }

  private async getSubcategories(categoryId: string): Promise<any[]> {
    const subcategories = await this.drizzleService.db.execute(
      sql`
       WITH RECURSIVE category_tree AS (
        -- Base case: Start with immediate subcategories of the given category
        SELECT * FROM ${CategoryTable}
        WHERE parent_id = ${categoryId}

        UNION ALL

        -- Recursive case: Fetch subcategories of subcategories
        SELECT c.*
        FROM ${CategoryTable} c
        INNER JOIN category_tree ct ON c.parent_id = ct.id
      )
      SELECT * FROM category_tree;
      `,
    );

    return subcategories.rows;
  }

  private async linkProductToParentCategory(
    productId: string,
    categoryIdsToLink: string[],
  ) {
    const links = categoryIdsToLink.map((categoryId) => ({
      productId,
      categoryId,
    }));

    await this.drizzleService.db
      .insert(ProductCategoryTable)
      .values(links)
      .onConflictDoNothing();
  }

  private async unLinkProductToParentCategory(
    productId: string,
    categoryIdsToUnlink: string[],
  ) {
    await this.drizzleService.db
      .delete(ProductCategoryTable)
      .where(
        and(
          eq(ProductCategoryTable.productId, productId),
          inArray(ProductCategoryTable.categoryId, categoryIdsToUnlink),
        ),
      );
  }

  private getAggregatedProducts() {
    return sql`array_agg(
        jsonb_build_object('product', ${ProductTable}, 'name', ${ProductTable.name}, 'imageUrl', ${ProductImageTable.url})
        ) FILTER (WHERE ${ProductTable.id} IS NOT NULL)`.as('products');
  }
}
