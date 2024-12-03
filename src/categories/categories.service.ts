import { Injectable } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { DrizzleService } from 'src/database/drizzle.service';
import {
  CategoryTable,
  ProductCategoryTable,
} from 'src/database/schemas/categories.schema';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { ProductTable } from 'src/database/schemas';
import { UpdateCategoryProductsDto } from './dto/update-category-products.dto';
import { validate as isUUID } from 'uuid';
import slugify from 'slugify';

@Injectable()
export class CategoriesService {
  constructor(private readonly drizzleService: DrizzleService) {}

  async create(createCategoryDto: CreateCategoryDto) {
    const { name, slug, imageUrl } = createCategoryDto;

    const [newCategory] = await this.drizzleService.db
      .insert(CategoryTable)
      .values({
        name,
        slug,
        imageUrl,
      })
      .returning();
    return newCategory;
  }

  async updateOrCreateCategoryWithProducts(
    categoryIdOrName: string,
    { productIdsToLink, productIdsToUnlink }: UpdateCategoryProductsDto,
  ) {
    let category: { id: string };

    if (!isUUID(categoryIdOrName)) {
      category = await this.create({
        name: categoryIdOrName,
        slug: slugify(categoryIdOrName, { lower: true }),
        imageUrl: '',
      });
    } else {
      category = await this.getCategory(categoryIdOrName);
    }

    if (!category) {
      throw new Error('Category not found');
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
    }

    return {
      message: 'Category products updated successfully',
      categoryId: category.id,
      linkedProducts: productIdsToLink || [],
      unlinkedProducts: productIdsToUnlink || [],
    };
  }

  async getAllCategories() {
    return await this.drizzleService.db.query.categories.findMany({
      with: { products: { with: { product: true } } },
    });
  }

  async getCategory(categoryId: string) {
    const categoryWithProducts =
      await this.drizzleService.db.query.categories.findFirst({
        where: (categories, { eq }) => eq(categories.id, categoryId),
        with: { products: { with: { product: true } } },
      });

    if (!categoryWithProducts) {
      throw new Error('Category not found');
    }

    return categoryWithProducts;
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

    const productIds = categoryWithProducts.products.map(
      (link) => link.product.id,
    );

    await this.drizzleService.db
      .delete(ProductTable)
      .where(inArray(ProductTable.id, productIds));

    await this.drizzleService.db
      .delete(CategoryTable)
      .where(sql`${CategoryTable.id} = ${categoryId}`);

    return {
      message: 'Category and all associated products deleted successfully',
      deletedProducts: productIds,
    };
  }

  async updateCategory(id: string, updateCategoryDto: UpdateCategoryDto) {
    const { imageUrl, name, slug } = updateCategoryDto;
    const [updatedCategory] = await this.drizzleService.db
      .update(CategoryTable)
      .set({ imageUrl, name, slug })
      .where(eq(CategoryTable.id, id))
      .returning();
    return updatedCategory;
  }
}
