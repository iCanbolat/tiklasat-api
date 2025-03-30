import { Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { DrizzleService } from 'src/database/drizzle.service';
import { CustomerTable } from 'src/database/schemas/customer-details.schema';
import { AddressTable } from 'src/database/schemas/addresses.schema';
import { GuestTable } from 'src/database/schemas/guests.schema';
import { Address } from 'src/common/types';
import { OrderTable } from 'src/database/schemas/orders.schema';
import {
  Customer,
  CustomerIdentifier,
  CustomerType,
} from '../interfaces/customer.types';
import { UserTable } from 'src/database/schemas';

@Injectable()
export class CustomerService {
  constructor(private readonly drizzleService: DrizzleService) {}

  async findOrCreate(identifier: CustomerIdentifier): Promise<Customer> {
    if (identifier.userId) {
      const details = await this.findOrCreateUserDetails(identifier.userId);
      return this.buildCustomerResponse(details, 'user', identifier);
    } else {
      const details = await this.findOrCreateGuestDetails(
        identifier.email,
        identifier.phone,
        identifier.name,
      );
      return this.buildCustomerResponse(details, 'guest', identifier);
    }
  }

  async createCustomerAddress(
    address: Address & { orderId: string },
    customer: Customer,
  ) {
    let id: string;

    console.log('CustomerServiceAddress:', address);
    console.log('CustomerServiceCustomer:', customer);
    

    if (!address.id) {
      [{ id }] = await this.drizzleService.db
        .insert(AddressTable)
        .values({
          ...address,
          [`${customer.type}Id`]: customer.id,
        })
        .returning({ id: AddressTable.id });
    } else {
      id = address.id;
    }

    if (customer.type === 'user') {
      await this.drizzleService.db
        .update(CustomerTable)
        .set({
          [`${address.type}AddressId`]: id,
        })
        .where(eq(CustomerTable.userId, customer.id));
    }

    await this.drizzleService.db
      .update(OrderTable)
      .set({
        [`${address.type}AddressId`]: id,
        [`${customer.type}Id`]: customer.id,
      })
      .where(eq(OrderTable.id, address.orderId));

    return id;
  }

  async findOne(
    customerId: string,
    type: CustomerType,
  ): Promise<Customer | null> {
    const query = this.drizzleService.db
      .select()
      .from(type === 'user' ? CustomerTable : GuestTable)
      .where(
        type === 'user'
          ? eq(CustomerTable.userId, customerId)
          : eq(GuestTable.id, customerId),
      )
      .$dynamic();

    if (type === 'user') {
      query.innerJoin(UserTable, eq(UserTable.id, CustomerTable.userId));
    }

    const result = await query.execute();

    return result[0] ? this.transformToCustomer(result[0], type) : null;
  }

  private transformToCustomer(data: any, type: CustomerType): Customer {
    const base = {
      id: type === 'user' ? data.userId : data.id,
      type,
      email: data.email,
      phone: data.phone,
    };

    if (type === 'user') {
      return {
        ...base,
        // loyaltyPoints: data.loyaltyPoints,
        // totalSpent: data.totalSpent,
        // other user-specific fields
      };
    } else {
      return base;
    }
  }

  async prepareAddressData(
    addresses: Address[],
    customer: Customer,
    orderId: string,
  ) {
    const addressIds: string[] = [];    

    for (const address of addresses) {
      const addressId = await this.createCustomerAddress(
        { ...address, orderId },
        customer,
      );
      addressIds.push(addressId);
    }

    const addressStrings = addresses.map((address) => {
      return `${address.street}, ${address.state}/${address.city}, ${address.country}, ${address.zipCode}`;
    });

    return {
      addressIds,
      addressStrings,
    };
  }

  private async findOrCreateUserDetails(userId: string) {
    let customer = await this.drizzleService.db
      .select()
      .from(CustomerTable)
      .where(eq(CustomerTable.userId, userId))
      .execute();

    if (!customer[0]) {
      customer = await this.drizzleService.db
        .insert(CustomerTable)
        .values({ userId })
        .returning();
    }

    return customer[0];
  }

  private async findOrCreateGuestDetails(
    email: string,
    phone: string,
    name: string,
  ) {
    let guest = await this.drizzleService.db
      .select()
      .from(GuestTable)
      .where(eq(GuestTable.email, email))
      .execute();

    if (!guest[0]) {
      guest = await this.drizzleService.db
        .insert(GuestTable)
        .values({ email, phone, name })
        .returning();
    }

    return guest[0];
  }

  private buildCustomerResponse(
    details: any,
    type: Customer['type'],
    identifier: CustomerIdentifier,
  ): Customer {
    return {
      id: type === 'user' ? details.userId : details.id,
      type,
      email: identifier.email,
      phone: identifier.phone,
      ...(type === 'user' && {
        loyaltyPoints: details.loyaltyPoints || 0,
        totalSpent: details.totalSpent || 0,
      }),
    };
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
