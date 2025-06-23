import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  Query,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { ProductsService } from '../providers/products.service';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { Public } from 'src/auth/decorators/public.decorator';
import {
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { GetProductsDto } from '../dto/get-products.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { FilesValidationPipe } from './pipes/multi-image-upload.pipe';
import { ParseProductImagesInterceptor } from '../parse-product-images.interceptor';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Public()
  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('files'), ParseProductImagesInterceptor)
  @HttpCode(201)
  @ApiOperation({
    summary: 'Creates a new product.',
    description:
      'This endpoint allows a admin to create product by providing necessary details. On success, product details are returned.',
  })
  @ApiBody({ type: CreateProductDto, description: 'Product create details' })
  @ApiCreatedResponse({
    description: 'Product successfully created',
  })
  create(
    @Body() createProductDto: CreateProductDto,
    @UploadedFiles(FilesValidationPipe) files?: Express.Multer.File[],
  ) {
    return this.productsService.create(createProductDto, files);
  }

  @Public()
  @Get()
  @HttpCode(200)
  getProducts(@Query() getProductsDto: GetProductsDto) {
    return this.productsService.findAll(getProductsDto);
  }

  @Public()
  @Get(':id')
  getProduct(@Param('id') id: string) {
    return this.productsService.findOne(id, { includeVariant: true });
  }

  @Public()
  @Patch()
  @HttpCode(200)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('files'), ParseProductImagesInterceptor)
  update(
    @Body() updateDto: UpdateProductDto | UpdateProductDto[],
    @UploadedFiles(FilesValidationPipe) files?: Express.Multer.File[],
  ) {
    return this.productsService.update(updateDto);
  }

  @Public()
  @HttpCode(200)
  @Delete()
  remove(@Body('ids') ids: string | string[]) {
    return this.productsService.delete(ids);
  }
}
