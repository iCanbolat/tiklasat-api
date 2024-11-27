import { Injectable } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { DrizzleService } from 'src/database/drizzle.service';
import { CategoryTable, ProductCategoryTable } from 'src/database/schemas/categories.schema';
import { LinkProductToCategoryDto } from './dto/link-product-category.dto';

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

  async linkProductToCategory(linkProductToCategoryDto: LinkProductToCategoryDto) {
    const { productId, categoryId } = linkProductToCategoryDto;

    await this.drizzleService.db.insert(ProductCategoryTable).values({
      productId,
      categoryId,
    });

    return { productId, categoryId };
  }

  findAll() {
    return `This action returns all categories`;
  }

  findOne(id: number) {
    return `This action returns a #${id} category`;
  }

  update(id: number, updateCategoryDto: UpdateCategoryDto) {
    return `This action updates a #${id} category`;
  }

  remove(id: number) {
    return `This action removes a #${id} category`;
  }
}
