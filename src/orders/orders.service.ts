import { Injectable } from '@nestjs/common';
import { CreateOrderDto, OrderItemDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { DrizzleService } from 'src/database/drizzle.service';
import { IOrderInstanceDto } from 'src/common/types';
import { OrderItemTable } from 'src/database/schemas/order-items.schema';
import { AddressTable } from 'src/database/schemas/addresses.schema';
import { OrderStatus, OrderTable } from 'src/database/schemas/orders.schema';
import { CustomerTable } from 'src/database/schemas/customer-details.schema';
import { and, count, countDistinct, eq, gte, inArray, sql } from 'drizzle-orm';
import { ProductsService } from 'src/products/providers/products.service';
import { GetOrderDto } from './dto/get-order.dto';
import { GuestTable } from 'src/database/schemas/guests.schema';
import { PaymentTable, UserTable } from 'src/database/schemas';
import { subDays } from 'date-fns';
import { generateReadableOrderId } from 'src/utils/order-id-generator';
import { AbstractCrudService } from 'src/common/services/base-service';

@Injectable()
export class OrdersService extends AbstractCrudService<typeof OrderTable> {
  constructor(
    protected drizzleService: DrizzleService,
    private productService: ProductsService,
  ) {
    super(drizzleService, OrderTable);
  }

  async create(createOrderDto: CreateOrderDto): Promise<{ id: string }> {
    const { items, status, customer } = createOrderDto;

    let customerId: string | undefined = undefined;

    if (customer && customer.type === 'user') {
      const existingCustomer =
        await this.drizzleService.db.query.customerDetails.findFirst({
          where: (cd, { eq }) => eq(cd.userId, customer.id),
        });

      if (!existingCustomer) {
        await this.drizzleService.db.insert(CustomerTable).values({
          userId: customer.id,
        });
      }
      customerId = customer.id;
    }

    const [{ id }] = await this.drizzleService.db
      .insert(OrderTable)
      .values({
        status: status ?? OrderStatus.Enum.PENDING,
        orderNumber: generateReadableOrderId(),
        userId: customerId,
        // ...(customer && {
        //   [`${customer.type}Id`]: customer.id,
        // }),
      })
      .returning({ id: OrderTable.id });

    const orderItems = items.map((item) => ({
      quantity: item.quantity,
      productId: item.productId,
      orderId: id,
    }));

    console.log(orderItems);

    await this.drizzleService.db.insert(OrderItemTable).values(orderItems);

    return { id };
  }

  async findAll(dto: GetOrderDto) {
    const { status, search, minPrice, maxPrice } = dto;

    // === 1️⃣ Orders query ===
    const orders = await this.drizzleService.db
      .select({
        id: OrderTable.id,
        createdAt: OrderTable.createdAt,
        status: OrderTable.status,
        customerName: sql`COALESCE(${GuestTable.name}, ${UserTable.name})`.as(
          'customerName',
        ),
        customerEmail:
          sql`COALESCE(${GuestTable.email}, ${UserTable.email})`.as(
            'customerEmail',
          ),
        totalItems: sql`COALESCE(SUM(${OrderItemTable.quantity}), 0)`.as(
          'totalItems',
        ),
        totalPrice: sql`COALESCE(SUM(${PaymentTable.amount}), 0)`.as(
          'totalPrice',
        ),
        paymentStatus: PaymentTable.status,
      })
      .from(OrderTable)
      .leftJoin(OrderItemTable, eq(OrderItemTable.orderId, OrderTable.id))
      .leftJoin(PaymentTable, eq(PaymentTable.orderId, OrderTable.id))
      .leftJoin(CustomerTable, eq(OrderTable.userId, CustomerTable.userId))
      .leftJoin(UserTable, eq(CustomerTable.userId, UserTable.id))
      .leftJoin(GuestTable, eq(OrderTable.guestId, GuestTable.id))
      .groupBy(
        OrderTable.id,
        PaymentTable.status,
        GuestTable.name,
        GuestTable.email,
        UserTable.name,
        UserTable.email,
      );

    // === 2️⃣ Order counts by status ===
    const counts = await this.drizzleService.db
      .select({
        status: OrderTable.status,
        count: count(OrderTable.id),
      })
      .from(OrderTable)
      .groupBy(OrderTable.status);

    const orderCountsByStatus = counts.reduce(
      (acc, item) => {
        acc[item.status] = item.count;
        return acc;
      },
      {} as Record<string, number>,
    );

    // === 3️⃣ Analytics (last 7 days) ===
    const weekAgo = subDays(new Date(), 7);

    const analyticsRaw = await this.drizzleService.db
      .select({
        totalRevenue: sql`COALESCE(SUM(${PaymentTable.amount}), 0)`.as(
          'totalRevenue',
        ),
        totalOrders: countDistinct(OrderTable.id).as('totalOrders'),
        cancelledOrders: count(
          sql`CASE WHEN ${OrderTable.status} = 'CANCELLED' THEN 1 ELSE NULL END`,
        ).as('cancelledOrders'),
        completedOrders: count(
          sql`CASE WHEN ${OrderTable.status} = 'DELIVERED' THEN 1 ELSE NULL END`,
        ).as('completedOrders'),
      })
      .from(OrderTable)
      .leftJoin(PaymentTable, eq(PaymentTable.orderId, OrderTable.id))
      .where(gte(OrderTable.createdAt, weekAgo))
      .execute();

    const analyticsData = analyticsRaw[0];

    const analytics = {
      totalRevenue: Number(analyticsData.totalRevenue ?? 0),
      totalOrders: analyticsData.totalOrders ?? 0,
      cancellationRate:
        analyticsData.totalOrders > 0
          ? (analyticsData.cancelledOrders / analyticsData.totalOrders) * 100
          : 0,
      completionRate:
        analyticsData.totalOrders > 0
          ? (analyticsData.completedOrders / analyticsData.totalOrders) * 100
          : 0,
    };

    return {
      orders,
      orderCountsByStatus,
      analytics,
    };
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
      billingAddress: order?.billingAddress || '',
      shippingAddress: order?.shippingAddress || '',
      customer,
      orderItems,
    };
  }

  async update(id: string, updateOrderDto: Partial<CreateOrderDto>) {
    const { addressIds, status, customer } = updateOrderDto;

    console.log('addressIdsUpdate:', addressIds);

    const orderId = await this.drizzleService.db
      .update(OrderTable)
      .set({
        billingAddressId: addressIds?.at(0),
        shippingAddressId: addressIds?.at(1),
        ...(customer && {
          [`${customer.type}Id`]: customer.id,
        }),
        status,
      })
      .where(eq(OrderTable.id, id))
      .returning({
        id: OrderTable.id,
      })
      .then((res) => res[0].id);

    return await this.findOne(orderId);
  }

  async updateOrderItems(orderId: string, newItems: OrderItemDto[]) {
    await this.drizzleService.db.transaction(async (tx) => {
      const currentItems = await tx.query.orderItems.findMany({
        where: eq(OrderItemTable.orderId, orderId),
      });

      const currentMap = new Map(
        currentItems.map((item) => [item.productId, item]),
      );
      const newMap = new Map(newItems.map((item) => [item.productId, item]));

      const toDelete = currentItems.filter(
        (item) => !newMap.has(item.productId),
      );
      const toInsert = newItems.filter(
        (item) => !currentMap.has(item.productId),
      );
      const toUpdate = newItems.filter((item) => {
        const current = currentMap.get(item.productId);
        return current && current.quantity !== item.quantity;
      });

      if (toDelete.length) {
        await tx.delete(OrderItemTable).where(
          inArray(
            OrderItemTable.productId,
            toDelete.map((i) => i.productId),
          ),
        );
      }

      if (toUpdate.length) {
        await Promise.all(
          toUpdate.map((item) =>
            tx
              .update(OrderItemTable)
              .set({ quantity: item.quantity })
              .where(
                and(
                  eq(OrderItemTable.orderId, orderId),
                  eq(OrderItemTable.productId, item.productId),
                ),
              ),
          ),
        );
      }

      if (toInsert.length) {
        await tx.insert(OrderItemTable).values(
          toInsert.map((item) => ({
            orderId,
            productId: item.productId,
            quantity: item.quantity,
          })),
        );
      }
    });
  }
  protected delete(id: string) {
    throw new Error('Method not implemented.');
  }
  protected applyFilters?<F>(query: any, filters: F, skipOrderBy?: boolean) {
    throw new Error('Method not implemented.');
  }
  remove(id: number) {
    return `This action removes a #${id} order`;
  }
}
