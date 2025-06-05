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

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Public()
  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('files'))
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
    if (files && files.length > 0) {
      createProductDto.images = files.map((file, index) => ({
        file,
        url: createProductDto.imageUrls?.[index] || '',
        cloudinaryId: createProductDto.cloudinaryIds?.[index] || undefined,
        displayOrder: createProductDto.displayOrders?.[index] || index,
      }));
    }

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
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productsService.update(id, updateProductDto);
  }

  @Public()
  @HttpCode(200)
  @Delete()
  remove(@Body('ids') ids: string | string[]) {
    return this.productsService.delete(ids);
  }
}
