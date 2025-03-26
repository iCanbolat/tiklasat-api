import { Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { DrizzleService } from 'src/database/drizzle.service';
import { CustomerTable } from 'src/database/schemas/customer-details.schema';
import { AddressTable } from 'src/database/schemas/addresses.schema';
import { GuestTable } from 'src/database/schemas/guests.schema';
import { Address } from 'src/common/types';
import { Customer } from 'src/payments/interfaces/payment-strategy.interface';
import { OrderTable } from 'src/database/schemas/orders.schema';

@Injectable()
export class CustomerService {
  constructor(private readonly drizzleService: DrizzleService) {}

  async findOrCreate({
    userId,
    email,
    phone,
  }: {
    userId?: string;
    email: string;
    phone: string;
  }): Promise<Customer> {
    let customer: Customer = {
      email,
      phone,
      id: '',
      type: userId ? 'user' : 'guest',
    };

    if (userId) {
      customer.id = (await this.findOrInsertCustomerDetail(userId)).userId;
    } else {
      customer.id = (await this.findOrInstertGuestDetail(customer)).id;
    }

    return customer;
  }

  async createCustomerAddress(
    address: Address & { orderId: string },
    customer: Customer,
  ) {
    const [{ id }] = await this.drizzleService.db
      .insert(AddressTable)
      .values({
        ...address,
        [`${customer.type}Id`]: customer.id,
      })
      .returning({
        id: AddressTable.id,
      });

    await this.drizzleService.db
      .update(OrderTable)
      .set({
        [`${address.type}AddressId`]: address.id,
        [`${customer.type}Id`]: customer.id,
      })
      .where(eq(OrderTable.id, address.orderId));

    return id;
  }

  async findOne(userId: string) {
    return await this.drizzleService.db.query.customerDetails.findFirst({
      where: (customers, { eq }) => eq(customers.userId, userId),
    });
  }

  async prepareAddressData(
    addresses: Address[],
    customer: Customer,
    orderId: string,
  ) {
    const addressIds = await Promise.all(
      addresses.map(async (address) => {
        console.log('AddressMap:', address);
        console.log('OrderID:', orderId);

        if (address.id) {
          await this.drizzleService.db
            .update(CustomerTable)
            .set({
              [`${address.type}AddressId`]: address.id,
            })
            .where(eq(CustomerTable.userId, customer.id));

          await this.drizzleService.db
            .update(OrderTable)
            .set({
              [`${address.type}AddressId`]: address.id,
              [`${customer.type}Id`]: customer.id,
            })
            .where(eq(OrderTable.id, orderId));

          return address.id;
        }

        return await this.createCustomerAddress(
          { ...address, orderId },
          customer,
        );
      }),
    );

    const addressStrings = addresses.map((address) => {
      return `${address.street}, ${address.state}/${address.city}, ${address.country}, ${address.zipCode}`;
    });
    return {
      addressIds,
      addressStrings,
    };
  }

  private async findOrInsertCustomerDetail(
    userId: string,
  ): Promise<typeof CustomerTable.$inferInsert> {
    let customer = await this.getCustomerDetails(userId);

    if (!customer) {
      customer = await this.createCustomerDetails(userId);
    }
    return customer;
  }

  private async findOrInstertGuestDetail(customer: Customer) {
    let [guest] = await this.drizzleService.db
      .select()
      .from(GuestTable)
      .where(eq(GuestTable.email, customer.email))
      .execute();

    if (!guest) {
      [guest] = await this.drizzleService.db
        .insert(GuestTable)
        .values({
          email: customer.email,
          phone: customer.phone,
        })
        .returning();
    }

    return guest;
  }

  async addPoints(userId: string, amountSpent: number, addresIds: string[]) {
    const earnedPoints = Math.floor(amountSpent * 1); // 🔹 1 point per $1 spent

    await this.drizzleService.db
      .update(CustomerTable)
      .set({
        totalOrders: sql`${CustomerTable.totalOrders} + ${1}`,
        billingAddressId: addresIds.at(0),
        shippingAddressId: addresIds.at(1),
        loyaltyPoints: sql`${CustomerTable.loyaltyPoints} + ${earnedPoints}`,
        totalSpent: sql`${CustomerTable.totalSpent} + ${amountSpent}`,
      })
      .where(eq(CustomerTable.userId, userId));
  }

  private async subtractPoints(customerId: string, points: number) {
    await this.drizzleService.db
      .update(CustomerTable)
      .set({
        loyaltyPoints: sql`${CustomerTable.loyaltyPoints} - ${points}`,
      })
      .where(eq(CustomerTable.userId, customerId));
  }

  async getCustomerDetails(userId: string): Promise<any> {
    const [customer] = await this.drizzleService.db
      .select()
      .from(CustomerTable)
      .where(eq(CustomerTable.userId, userId))
      .execute();

    return customer;
  }

  async createCustomerDetails(userId: string): Promise<any> {
    const [customer] = await this.drizzleService.db
      .insert(CustomerTable)
      .values({
        userId,
      })
      .returning();

    return customer;
  }

  async redeemPoints(
    customerId: string,
    pointsToRedeem: number,
  ): Promise<number> {
    const customer = await this.getCustomerDetails(customerId);

    if (!customer || customer.loyaltyPoints < pointsToRedeem) {
      throw new Error('Not enough points');
    }

    const discountAmount = (pointsToRedeem / 1000) * 10;

    await this.subtractPoints(customerId, pointsToRedeem);

    return discountAmount;
  }
}
