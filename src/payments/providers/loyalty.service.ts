import { Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { DrizzleService } from 'src/database/drizzle.service';
import { CustomerTable } from 'src/database/schemas/customer-details.schema';

@Injectable()
export class LoyaltyService {
  constructor(private readonly drizzleService: DrizzleService) {}

  // async addPoints(customerId: string, amountSpent: number) {
  //   const earnedPoints = Math.floor(amountSpent * 1); // 🔹 1 point per $1 spent

  //   await this.drizzleService.db
  //     .update(CustomerTable)
  //     .set({
  //       loyaltyPoints: sql`${CustomerTable.loyaltyPoints} + ${earnedPoints}`,
  //     })
  //     .where(eq(CustomerTable.id, customerId));
  // }

  //   async subtractPoints(customerId: string, points: number) {
  //       await this.drizzleService.db
  //       .update(CustomerTable)
  //       .set({
  //           loyaltyPoints: sql`${CustomerTable.loyaltyPoints} - ${points}`,
  //       })
  //       .where(eq(CustomerTable.id, customerId));
  //   }

  //   async getPoints(customerId: string) {
  //       const [customer] = await this.drizzleService.db
  //       .select()
  //       .from(CustomerTable)
  //       .where(eq(CustomerTable.id, customerId))
  //       .execute();

  //       return customer.loyaltyPoints;
  //   }
}
