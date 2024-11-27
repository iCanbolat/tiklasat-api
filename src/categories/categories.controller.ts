import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Public } from 'src/auth/decorators/public.decorator';
import { ApiBody, ApiCreatedResponse, ApiOperation } from '@nestjs/swagger';
import { LinkProductToCategoryDto } from './dto/link-product-category.dto';

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
  @Post('link')
  @HttpCode(200)
  @ApiBody({ type: LinkProductToCategoryDto })
  @ApiOperation({
    summary: 'Links product to category.',
    description:
      'This endpoint allows a admin to link product to category.',
  })
  @ApiCreatedResponse({
    description: 'Product successfully linked from category',
    type: LinkProductToCategoryDto,
  })
  async linkProductToCategory(
    @Body() linkProductToCategoryDto: LinkProductToCategoryDto,
  ) {
    return await this.categoriesService.linkProductToCategory(
      linkProductToCategoryDto,
    );
  }

  @Delete('unlink')
  @HttpCode(200)
  @ApiBody({ type: LinkProductToCategoryDto })
  @ApiOperation({
    summary: 'Unlinks product to category.',
    description:
      'This endpoint allows a admin to unlink product to category.',
  })
  async unlinkProductFromCategory(@Body() linkDto: LinkProductToCategoryDto) {
    return await this.categoriesService.unlinkProductFromCategory(linkDto);
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
  async getCategory(
    @Param() id: string,
  ) {
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
  remove(@Param('id') id: string) {
    return this.categoriesService.removeCategory(id);
  }
}
