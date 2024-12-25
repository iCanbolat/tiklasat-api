import { Injectable } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { DrizzleService } from 'src/database/drizzle.service';
import { OrderItemTable, OrderTable } from 'src/database/schemas';

@Injectable()
export class OrdersService {
  constructor(private drizzleService: DrizzleService) {}
  
  async create(createOrderDto: CreateOrderDto) {
    const { items, guestUser, status, userId } = createOrderDto;

    const [order] = await this.drizzleService.db
      .insert(OrderTable)
      .values({
        userId,
        guestUser,
        status,
      })
      .returning();

    const orderItems = items.map((item) => ({
      ...item,
      orderId: order.id,
    }));

    await this.drizzleService.db.insert(OrderItemTable).values(orderItems);

    return 'This action adds a new order';
  }

  findAll() {
    return `This action returns all orders`;
  }

  findOne(id: number) {
    return `This action returns a #${id} order`;
  }

  update(id: number, updateOrderDto: UpdateOrderDto) {
    return `This action updates a #${id} order`;
  }

  remove(id: number) {
    return `This action removes a #${id} order`;
  }
}
