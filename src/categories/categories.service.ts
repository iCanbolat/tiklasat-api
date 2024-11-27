import { Injectable } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { DrizzleService } from 'src/database/drizzle.service';
import {
  CategoryTable,
  ProductCategoryTable,
} from 'src/database/schemas/categories.schema';
import { LinkProductToCategoryDto } from './dto/link-product-category.dto';
import { eq, sql } from 'drizzle-orm';
import { ProductTable } from 'src/database/schemas';

@Injectable()
export class CategoriesService {
  constructor(private readonly drizzleService: DrizzleService) {}

  async create(createCategoryDto: CreateCategoryDto) {
    const { name, slug, imageUrl } = createCategoryDto;

    const newCategory = await this.drizzleService.db
      .insert(CategoryTable)
      .values({
        name,
        slug,
        imageUrl,
      })
      .returning();
    return newCategory;
  }

  async linkProductToCategory(
    linkProductToCategoryDto: LinkProductToCategoryDto,
  ) {
    const { productId, categoryId } = linkProductToCategoryDto;

    await this.drizzleService.db.insert(ProductCategoryTable).values({
      productId,
      categoryId,
    });

    return { productId, categoryId };
  }

  async unlinkProductFromCategory(linkDto: LinkProductToCategoryDto) {
    const { productId, categoryId } = linkDto;

    const result = await this.drizzleService.db
      .delete(ProductCategoryTable)
      .where(
        sql`${ProductCategoryTable.productId} = ${productId} AND ${ProductCategoryTable.categoryId} = ${categoryId}`
      );

    if (result.rowCount === 0) {
      throw new Error('Link not found or already removed');
    }

    return { message: 'Product successfully unlinked from category', productId, categoryId };
  }

  async getAllCategories() {
    return await this.drizzleService.db.query.categories.findMany({
      with: { products: true },
    });
  }

  async getCategory(categoryId: string) {
    const categoryWithProducts =
      await this.drizzleService.db.query.categories.findFirst({
        where: (categories, { eq }) => eq(categories.id, categoryId),
      });

    if (!categoryWithProducts) {
      throw new Error('Category not found');
    }

    return categoryWithProducts;

    // let query = this.drizzleService.db
    //   .select()
    //   .from(CategoryTable)
    //   .where(eq(CategoryTable.id, categoryId))
    //   .$dynamic();

    // if(includeProducts){
    //   query.leftJoin(ProductTable, eq(ProductCategoryTable.productId, ProductTable.id));
    // }

    // const result = await query.execute();
    // if (!result) {
    //   throw new Error('Category not found');
    // }
    // console.log(result);

    // return result;
  }

  async removeCategory(id: string) {
    await this.drizzleService.db
      .delete(CategoryTable)
      .where(eq(CategoryTable.id, id));
    return `Category deleted by given id -> #${id}`;
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
