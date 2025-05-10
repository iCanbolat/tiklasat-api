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
} from '@nestjs/common';
import { ProductsService } from '../providers/products.service';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { Public } from 'src/auth/decorators/public.decorator';
import { ApiBody, ApiCreatedResponse, ApiOperation } from '@nestjs/swagger';
import { GetProductsDto } from '../dto/get-products.dto';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Public()
  @Post()
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
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @Public()
  @Get()
  @HttpCode(201)
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
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productsService.delete(id);
  }
}
