import { Injectable } from '@nestjs/common';
import { DrizzleService } from 'src/database/drizzle.service';
import { CustomerTable } from 'src/database/schemas/customer-details.schema';
import { eq, sql } from 'drizzle-orm';
import { log } from 'node:console';

export interface LoyaltyConfig {
  pointsPerDollar: number; // How many points per dollar spent
  pointsToDiscountRatio: number; // How many points equal $1 discount
  maxDiscountPercentage: number; // Maximum discount as percentage of total
  minPointsForDiscount: number; // Minimum points required to apply discount
}

export interface DiscountCalculation {
  availablePoints: number;
  maxDiscountAmount: number;
  recommendedPointsToRedeem: number;
  discountAmount: number;
  finalTotal: number;
  pointsToRedeem: number;
}

export interface OrderItem {
  productId: string;
  quantity: number;
  price: number;
  loyaltyPointsMultiplier?: number;
}

@Injectable()
export class LoyaltyService {
  private readonly defaultConfig: LoyaltyConfig = {
    pointsPerDollar: 1, // 1 point per $1 spent
    pointsToDiscountRatio: 100, // 100 points = $1 discount
    maxDiscountPercentage: 50, // Max 50% discount
    minPointsForDiscount: 100, // Need at least 100 points to redeem
  };

  constructor(private readonly drizzleService: DrizzleService) {}

  /**
   * Calculate how many loyalty points a customer will earn from an order
   */
  calculatePointsEarned(orderItems: OrderItem[]): number {
    return orderItems.reduce((totalPoints, item) => {
      const itemTotal = item.price * item.quantity;
      const multiplier = item.loyaltyPointsMultiplier || 1.0;
      const pointsForItem = Math.floor(
        itemTotal * this.defaultConfig.pointsPerDollar * multiplier,
      );
      return totalPoints + pointsForItem;
    }, 0);
  }

  /**
   * Calculate available discount for a customer
   */
  async calculateAvailableDiscount(
    userId: string,
    orderTotal: number,
    pointsToRedeem?: number,
  ): Promise<DiscountCalculation> {
    // Get customer's current loyalty points
    const customer = await this.drizzleService.db
      .select({ loyaltyPoints: CustomerTable.loyaltyPoints })
      .from(CustomerTable)
      .where(eq(CustomerTable.userId, userId))
      .then((res) => res[0]);

    if (!customer) {
      throw new Error('Customer not found');
    }

    const availablePoints = customer.loyaltyPoints || 0;

    // Check if customer has enough points for any discount
    if (availablePoints < this.defaultConfig.minPointsForDiscount) {
      return {
        availablePoints,
        maxDiscountAmount: 0,
        recommendedPointsToRedeem: 0,
        discountAmount: 0,
        finalTotal: orderTotal,
        pointsToRedeem: 0,
      };
    }

    // Calculate maximum possible discount based on percentage limit
    const maxDiscountByPercentage =
      (orderTotal * this.defaultConfig.maxDiscountPercentage) / 100;

    // Calculate maximum discount based on available points
    const maxDiscountByPoints =
      availablePoints / this.defaultConfig.pointsToDiscountRatio;

    // Take the smaller of the two limits
    const maxDiscountAmount = Math.min(
      maxDiscountByPercentage,
      maxDiscountByPoints,
      orderTotal,
    );

    let actualPointsToRedeem: number;
    let discountAmount: number;

    if (pointsToRedeem !== undefined) {
      // Customer specified how many points to redeem
      actualPointsToRedeem = Math.min(pointsToRedeem, availablePoints);
      discountAmount = Math.min(
        actualPointsToRedeem / this.defaultConfig.pointsToDiscountRatio,
        maxDiscountAmount,
      );
    } else {
      // Recommend optimal points to redeem (use maximum available discount)
      actualPointsToRedeem = Math.floor(
        maxDiscountAmount * this.defaultConfig.pointsToDiscountRatio,
      );
      discountAmount = maxDiscountAmount;
    }

    const finalTotal = Math.max(0, orderTotal - discountAmount);

    return {
      availablePoints,
      maxDiscountAmount,
      recommendedPointsToRedeem: Math.floor(
        maxDiscountAmount * this.defaultConfig.pointsToDiscountRatio,
      ),
      discountAmount,
      finalTotal,
      pointsToRedeem: actualPointsToRedeem,
    };
  }

  /**
   * Apply loyalty discount to an order
   */
  async applyDiscount(
    userId: string,
    pointsToRedeem: number,
  ): Promise<{ discountAmount: number }> {
    const customer = await this.drizzleService.db
      .select({ loyaltyPoints: CustomerTable.loyaltyPoints })
      .from(CustomerTable)
      .where(eq(CustomerTable.userId, userId))
      .then((res) => res[0]);

    if (!customer || customer.loyaltyPoints < pointsToRedeem) {
      throw new Error('Insufficient loyalty points');
    }

    if (pointsToRedeem < this.defaultConfig.minPointsForDiscount) {
      throw new Error(
        `Minimum ${this.defaultConfig.minPointsForDiscount} points required for discount`,
      );
    }

    const discountAmount =
      pointsToRedeem / this.defaultConfig.pointsToDiscountRatio;

    // Deduct points from customer
    await this.drizzleService.db
      .update(CustomerTable)
      .set({
        loyaltyPoints: sql`${CustomerTable.loyaltyPoints} - ${pointsToRedeem}`,
      })
      .where(eq(CustomerTable.userId, userId));

    return { discountAmount };
  }

  /**
   * Award loyalty points after successful payment
   */
  async awardPoints(
    userId: string,
    orderItems: OrderItem[],
    amountSpent: number,
  ): Promise<number> {
    const pointsEarned = this.calculatePointsEarned(orderItems);

    console.log(`Awarding ${pointsEarned} points to user ${userId}`);

    const s = await this.drizzleService.db
      .update(CustomerTable)
      .set({
        loyaltyPoints: sql`${CustomerTable.loyaltyPoints} + ${pointsEarned}`,
        totalOrders: sql`${CustomerTable.totalOrders} + 1`,
        totalSpent: sql`${CustomerTable.totalSpent} + ${amountSpent}`,
      })
      .where(eq(CustomerTable.userId, userId))
      .returning({ newPoints: CustomerTable.loyaltyPoints });

     console.log(`s after awarding points:`, s);
     

    return pointsEarned;
  }

  /**
   * Get loyalty configuration for frontend
   */
  getLoyaltyConfig(): LoyaltyConfig {
    return this.defaultConfig;
  }

  /**
   * Reverse a loyalty transaction (for refunds)
   */
  async reverseLoyaltyTransaction(
    userId: string,
    pointsToRemove: number,
    amountToDeduct: number,
  ): Promise<void> {
    await this.drizzleService.db
      .update(CustomerTable)
      .set({
        loyaltyPoints: sql`GREATEST(0, ${CustomerTable.loyaltyPoints} - ${pointsToRemove})`,
        totalOrders: sql`GREATEST(0, ${CustomerTable.totalOrders} - 1)`,
        totalSpent: sql`GREATEST(0, ${CustomerTable.totalSpent} - ${amountToDeduct})`,
      })
      .where(eq(CustomerTable.userId, userId));
  }
}
