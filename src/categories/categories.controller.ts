import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  Put,
  Query,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Public } from 'src/auth/decorators/public.decorator';
import { ApiBody, ApiCreatedResponse, ApiOperation } from '@nestjs/swagger';
import { LinkProductToCategoryDto } from './dto/link-product-category.dto';
import { UpdateCategoryProductsDto } from './dto/update-category-products.dto';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Public()
  @Post()
  @HttpCode(201)
  @ApiOperation({
    summary: 'Creates a new category.',
    description:
      'This endpoint allows a admin to create category by providing necessary details. On success, category details are returned.',
  })
  @ApiBody({ type: CreateCategoryDto, description: 'Category create details' })
  @ApiCreatedResponse({
    description: 'Category successfully created',
    type: CreateCategoryDto,
  })
  create(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoriesService.create(createCategoryDto);
  }

  @Public()
  @Put(':id/products')
  async updateCategoryProducts(
    @Param('id') categoryId: string,
    @Body() updateCategoryProductsDto: UpdateCategoryProductsDto,
  ) {
    return await this.categoriesService.updateOrCreateCategoryWithProducts(
      categoryId,
      updateCategoryProductsDto,
    );
  }

  @Public()
  @Get()
  @HttpCode(200)
  async getAllCategories() {
    return await this.categoriesService.getAllCategories();
  }

  @Public()
  @Get(':id')
  @HttpCode(200)
  async getCategory(@Param('id') id: string) {
    console.log(id);

    return await this.categoriesService.getCategory(id);
  }

  @Public()
  @Patch(':id')
  @HttpCode(200)
  async updateCategory(
    @Param() id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    return await this.categoriesService.updateCategory(id, updateCategoryDto);
  }

  @Public()
  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Query('deleteProducts') deleteProducts: string,
  ) {
    const shouldDeleteProducts = deleteProducts === 'true';
    return this.categoriesService.removeCategory(id, shouldDeleteProducts);
  }
}
