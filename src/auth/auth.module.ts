import { JwtModule } from '@nestjs/jwt';
import { Module } from '@nestjs/common';
import { AuthService } from './providers/auth.service';
import { AuthController } from './controllers/auth.controller';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { HashingService } from './providers/hashing.service';
import { BcryptService } from './providers/bcrypt.service';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RefreshTokenStrategy } from './strategies/refresh-token-strategy';
import { CustomerService } from './providers/customer.service';
import { LoyaltyService } from './providers/loyalty.service';
import { CustomerController } from './controllers/customer.controller';
import { LoyaltyController } from './controllers/loyalty.controller';
import { AddressCleanupService } from './tasks/cleanup.task';
import { RefreshTokenService } from './providers/refresh-token.service';
import { TokenCleanupTask } from './tasks/token-cleanup.task';
import { RateLimitMiddleware } from './middleware/rate-limit.middleware';
import { SecurityHeadersMiddleware } from './middleware/security-headers.middleware';
import { AuthRateLimitInterceptor } from './interceptors/auth-rate-limit.interceptor';

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: async (configService: ConfigService) => {
        return {
          secret: configService.get<string>('JWT_SECRET'),
          signOptions: {
            expiresIn: `${configService.get<string>('JWT_TOKEN_TTL')}ms`,
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [
    { provide: HashingService, useClass: BcryptService },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    AuthService,
    RefreshTokenService,
    LocalStrategy,
    JwtStrategy,
    RefreshTokenStrategy,
    CustomerService,
    LoyaltyService,
    AddressCleanupService,
    TokenCleanupTask,
    RateLimitMiddleware,
    SecurityHeadersMiddleware,
    AuthRateLimitInterceptor,
  ],
  controllers: [AuthController, CustomerController, LoyaltyController],
  exports: [CustomerService, LoyaltyService],
})
export class AuthModule {}
