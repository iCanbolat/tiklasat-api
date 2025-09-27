import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RefreshTokenService } from '../providers/refresh-token.service';

@Injectable()
export class TokenCleanupTask {
  private readonly logger = new Logger(TokenCleanupTask.name);

  constructor(private readonly refreshTokenService: RefreshTokenService) {}

  /**
   * Clean up expired refresh tokens every day at 3 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleExpiredTokenCleanup() {
    this.logger.log('Starting expired token cleanup task');

    try {
      await this.refreshTokenService.cleanupExpiredTokens();
      this.logger.log('Expired token cleanup completed successfully');
    } catch (error) {
      this.logger.error('Expired token cleanup failed', error);
    }
  }

  /**
   * Log active session statistics every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async logSessionStatistics() {
    // This could be expanded to gather and log session statistics
    this.logger.debug('Session statistics logged');
  }
}
