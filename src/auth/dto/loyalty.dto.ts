import { IsNumber, IsOptional, IsPositive, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CalculateDiscountDto {
  @IsUUID()
  userId: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Type(() => Number)
  orderTotal: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Min(100)
  @Type(() => Number)
  pointsToRedeem?: number;
}

export class ApplyDiscountDto {
  @IsUUID()
  userId: string;

  @IsNumber()
  @IsPositive()
  @Min(100)
  @Type(() => Number)
  pointsToRedeem: number;
}

export class DiscountResponseDto {
  availablePoints: number;
  maxDiscountAmount: number;
  recommendedPointsToRedeem: number;
  discountAmount: number;
  finalTotal: number;
  pointsToRedeem: number;
}

export class OrderItemDto {
  @IsUUID()
  productId: string;

  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  quantity: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Type(() => Number)
  price: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Type(() => Number)
  loyaltyPointsMultiplier?: number;
}
