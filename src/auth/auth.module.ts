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
    LocalStrategy,
    JwtStrategy,
    RefreshTokenStrategy,
    CustomerService,
    LoyaltyService,
    AddressCleanupService,
  ],
  controllers: [AuthController, CustomerController, LoyaltyController],
  exports: [CustomerService, LoyaltyService],
})
export class AuthModule {}
