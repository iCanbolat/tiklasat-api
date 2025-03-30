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
import { ProductsService } from 'src/products/providers/products.service';

@Injectable()
export class OrdersService {
  constructor(
    private drizzleService: DrizzleService,
    private productService: ProductsService,
  ) {}

  async create(createOrderDto: CreateOrderDto): Promise<{ id: string }> {
    const { items, status, customer } = createOrderDto;

    const [order] = await this.drizzleService.db
      .insert(OrderTable)
      .values({
        [`${customer.type}Id`]: customer.id,
        status,
      })
      .returning({ id: OrderTable.id });

    const orderItems = items.map((item) => ({
      quantity: item.quantity,
      productId: item.product.id,
      orderId: order.id,
    }));

    console.log(orderItems);
    

    await this.drizzleService.db.insert(OrderItemTable).values(orderItems);

    return { id: order.id };
  }

  findAll() {
    return `This action returns all orders`;
  }

  async findOne(id: string) {
    const order = await this.drizzleService.db.query.orders.findFirst({
      where: (order, { eq }) => eq(order.id, id),
      with: {
        items: true,
        billingAddress: true,
        shippingAddress: true,
      },
    });

    if (!order) throw new Error('Order not found');

    const orderItems = await Promise.all(
      order.items.map(async (item) => {
        const product = await this.productService.findOne(item.productId, {
          select: { product: { id: true, name: true, price: true } },
        });
        return { ...product, quantity: item.quantity };
      }),
    );

    const customer = order.userId
      ? await this.drizzleService.db.query.users.findFirst({
          where: (user, { eq }) => eq(user.id, order.userId),
        })
      : order.guestId
        ? await this.drizzleService.db.query.guestsTable.findFirst({
            where: (guest, { eq }) => eq(guest.id, order.guestId),
          })
        : null;

    return {
      billingAddress: order.billingAddress,
      shippingAddress: order.shippingAddress,
      customer,
      orderItems,
    };
  }

  async update(id: string, updateOrderDto: Partial<CreateOrderDto>) {
    const { addressIds, status } = updateOrderDto;

    console.log('addressIdsUpdate:',addressIds);
    
    const orderId = await this.drizzleService.db
      .update(OrderTable)
      .set({
        billingAddressId: addressIds.at(0),
        shippingAddressId: addressIds.at(1),
        status,
      })
      .where(eq(OrderTable.id, id))
      .returning({
        id: OrderTable.id,
      })
      .then((res) => res[0].id);

    return await this.findOne(orderId);
  }

  remove(id: number) {
    return `This action removes a #${id} order`;
  }
}
