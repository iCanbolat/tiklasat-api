import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { Public } from 'src/auth/decorators/public.decorator';
import { ProductVariantService } from '../providers/product-variant.service';
 import { CreateProductVariantDto } from '../dto/create-product-variant.dto';
import { UpdateProductVariantDto } from '../dto/update-product-variant.dto';

@Controller('variants')
export class ProductVariantController {
  constructor(private readonly productVariantService: ProductVariantService) {}

  @Public()
  @Get(':id')
  getProductVariant(@Param('id') id: string) {
    return this.productVariantService.getProductVariant(id,true);
  }

  @Public()
  @Post(':id')
  createProductVariant(
    @Param('id') id: string,
    @Body() createVariantDto: CreateProductVariantDto,
  ) {
    return this.productVariantService.createProductVariant(
      id,
      createVariantDto,
    );
  }

  @Public()
  @Delete(':id')
  deleteProductVariant(@Param('id') id: string) {
    return this.productVariantService.deleteProductVariant(id);
  }

  @Public()
  @Patch(':id')
  updateProductVariant(
    @Param('id') id: string,
    @Body() updateProductVariant: UpdateProductVariantDto,
  ) {
    return this.productVariantService.updateProductVariant(
      id,
      updateProductVariant,
    );
  }
}
