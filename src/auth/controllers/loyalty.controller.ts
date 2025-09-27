import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CookieUser } from '../decorators/cookie-user.decorator';
import { LoyaltyService } from '../providers/loyalty.service';
import { CustomerService } from '../providers/customer.service';
import {
  CalculateDiscountDto,
  ApplyDiscountDto,
  DiscountResponseDto,
} from '../dto/loyalty.dto';

@Controller('loyalty')
@UseGuards(JwtAuthGuard)
export class LoyaltyController {
  constructor(
    private readonly loyaltyService: LoyaltyService,
    private readonly customerService: CustomerService,
  ) {}

  @Get('status')
  async getLoyaltyStatus(@CookieUser('sub') userId: string) {
    const customer = await this.customerService.getCustomerDetails(userId);

    if (!customer) {
      return {
        loyaltyPoints: 0,
        totalOrders: 0,
        totalSpent: 0,
        config: this.loyaltyService.getLoyaltyConfig(),
      };
    }

    return {
      loyaltyPoints: customer.loyaltyPoints || 0,
      totalOrders: customer.totalOrders || 0,
      totalSpent: customer.totalSpent || 0,
      config: this.loyaltyService.getLoyaltyConfig(),
    };
  }

  @Post('calculate-discount')
  async calculateDiscount(
    @CookieUser('sub') userId: string,
    @Body() calculateDiscountDto: Omit<CalculateDiscountDto, 'userId'>,
  ): Promise<DiscountResponseDto> {
    return this.loyaltyService.calculateAvailableDiscount(
      userId,
      calculateDiscountDto.orderTotal,
      calculateDiscountDto.pointsToRedeem,
    );
  }

  @Get('config')
  getLoyaltyConfig() {
    return this.loyaltyService.getLoyaltyConfig();
  }
}
