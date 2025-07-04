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
  UsePipes,
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
import { ParseProductImagesInterceptor } from '../parse-product-images.interceptor';
import { FilesValidationPipe } from 'src/common/pipes/multi-image-upload.pipe';
import { FormArrayTransformPipe } from 'src/common/pipes/form-array-transform.pipe';

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
    console.log(createProductDto);

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
  @UsePipes(new FormArrayTransformPipe(UpdateProductDto))
  update(
    @Body()
    updateDto: UpdateProductDto[],
    @UploadedFiles(FilesValidationPipe) files?: Express.Multer.File[],
  ) {
    console.log(updateDto);
    
    return this.productsService.update(updateDto);
  }

  @Public()
  @HttpCode(200)
  @Delete()
  remove(@Body('ids') ids: string | string[]) {
    return this.productsService.delete(ids);
  }
}
