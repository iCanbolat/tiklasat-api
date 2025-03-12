import { Injectable } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { DrizzleService } from 'src/database/drizzle.service';
import { IOrderInstanceDto } from 'src/common/types';
import { OrderItemTable } from 'src/database/schemas/order-items.schema';
import { AddressTable } from 'src/database/schemas/addresses.schema';
import { OrderTable } from 'src/database/schemas/orders.schema';
import { CustomerTable } from 'src/database/schemas/customer-details.schema';

@Injectable()
export class OrdersService {
  constructor(private drizzleService: DrizzleService) {}

  async create(createOrderDto: IOrderInstanceDto): Promise<{ id: string }> {
    const { items, status, userId, total, address, buyer } = createOrderDto;

    const [order] = await this.drizzleService.db
      .insert(OrderTable)
      .values({
        customerId: userId ?? null,
        status,
      })
      .returning({ id: OrderTable.id });

    address.forEach(async (address) => {
      await this.drizzleService.db.insert(AddressTable).values({
        ...address,
        orderId: order.id,
      });
    });

    await this.drizzleService.db.insert(CustomerTable).values({
      ...buyer,
      userId: userId ?? null,
    });

    const orderItems = items.map((item) => ({
      ...item,
      orderId: order.id,
    }));

    await this.drizzleService.db.insert(OrderItemTable).values(orderItems);

    return { id: order.id };
  }

  findAll() {
    return `This action returns all orders`;
  }

  findOne(id: number) {
    return `This action returns a #${id} order`;
  }

  update(id: number, updateOrderDto: IOrderInstanceDto) {
    return `This action updates a #${id} order`;
  }

  remove(id: number) {
    return `This action removes a #${id} order`;
  }
}
