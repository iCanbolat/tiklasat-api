import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { Public } from 'src/auth/decorators/public.decorator';
import { GetOrderDto } from './dto/get-order.dto';
import { CookieUser } from 'src/auth/decorators/cookie-user.decorator';
import { UpdateOrderItemsDto } from './dto/update-order-itetms.dto';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Public()
  @Post()
  create(
    @Body() createOrderDto: CreateOrderDto,
    @CookieUser() user: { sub: string },
  ) {
    if (user) createOrderDto.customer = { id: user.sub, type: 'user' };

    return this.ordersService.create(createOrderDto);
  }

  @Public()
  @Get()
  findAll(@Query() dto: GetOrderDto) {
    return this.ordersService.findAll(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Patch(':id/items')
  async updateOrderItems(
    @Param('id') id: string,
    @Body() updateItemsDto: UpdateOrderItemsDto,
    @CookieUser() user?: { sub: string },
  ) {
    return this.ordersService.updateOrderItems(id, updateItemsDto.items);
  }
  
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ordersService.remove(+id);
  }
}
