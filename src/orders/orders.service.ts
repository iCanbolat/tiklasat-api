import { Injectable } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { DrizzleService } from 'src/database/drizzle.service';
import { IOrderInstanceDto } from 'src/common/types';
import { OrderItemTable } from 'src/database/schemas/order-items.schema';
import { AddressTable } from 'src/database/schemas/addresses.schema';
import { OrderTable } from 'src/database/schemas/orders.schema';
import { CustomerTable } from 'src/database/schemas/customer-details.schema';
import { eq } from 'drizzle-orm';

@Injectable()
export class OrdersService {
  constructor(private drizzleService: DrizzleService) {}

  async create(createOrderDto: CreateOrderDto): Promise<{ id: string }> {
    const { items, status, customer } = createOrderDto;

    console.log('customer', customer);
    
    const [order] = await this.drizzleService.db
      .insert(OrderTable)
      .values({
        ...(customer.type === 'user' ? { userId: customer.id } : {}),
        ...(customer.type === 'guest' ? { guestId: customer.id } : {}),
        status,
      })
      .returning({ id: OrderTable.id });

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

  async update(id: string, updateOrderDto: Partial<CreateOrderDto>) {
    const { addressIds, status } = updateOrderDto;

    return await this.drizzleService.db
      .update(OrderTable)
      .set({
        billingAddressId: addressIds.at(0),
        shippingAddressId: addressIds.at(1),
        status,
      })
      .where(eq(OrderTable.id, id))
      .returning({ id: OrderTable.id })
      .then((res) => res[0]);
  }

  remove(id: number) {
    return `This action removes a #${id} order`;
  }
}
