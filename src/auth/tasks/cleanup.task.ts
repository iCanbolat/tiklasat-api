import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CustomerService } from '../providers/customer.service';

@Injectable()
export class AddressCleanupService {
  private readonly logger = new Logger(AddressCleanupService.name);

  constructor(private readonly customerService: CustomerService) {}

  // Runs monthly on the 1st day at 2:00 AM
  @Cron('0 2 1 * *', {
    name: 'cleanup-guest-addresses',
    timeZone: 'UTC',
  })
  async handleMonthlyCleanup() {
    this.logger.log('Starting monthly guest address cleanup...');

    try {
      const deletedCount =
        await this.customerService.cleanupOldGuestAddresses(30);
      this.logger.log(
        `✅ Monthly cleanup completed. Deleted ${deletedCount} guest addresses`,
      );
    } catch (error) {
      this.logger.error('❌ Monthly cleanup failed:', error.message);
    }
  }

  // Manual cleanup method for testing or admin use
  async manualCleanup(daysOld: number = 30): Promise<number> {
    this.logger.log(
      `Manual cleanup initiated for addresses older than ${daysOld} days`,
    );

    try {
      const deletedCount =
        await this.customerService.cleanupOldGuestAddresses(daysOld);
      this.logger.log(
        `✅ Manual cleanup completed. Deleted ${deletedCount} addresses`,
      );
      return deletedCount;
    } catch (error) {
      this.logger.error('❌ Manual cleanup failed:', error.message);
      throw error;
    }
  }
}
