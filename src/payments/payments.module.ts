import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { IyzicoPaymentStrategy } from './strategies/iyzico.strategy';
import { StripePaymentStrategy } from './strategies/stripe.strategy';
import { PaymentsService } from './payments.service';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MailModule } from 'src/mail/mail.module';

@Module({
  imports: [ConfigModule, MailModule, EventEmitterModule.forRoot()],
  controllers: [PaymentsController],
  providers: [
    // {
    //   provide: 'IyzicoConfig',
    //   useFactory: (configService: ConfigService) => ({
    //     apiKey: configService.get<string>('IYZICO_API_KEY'),
    //     secretKey: configService.get<string>('IYZICO_SECRET_KEY'),
    //     baseUrl:
    //       configService.get<string>('IYZICO_BASE_URL') ||
    //       'https://sandbox-api.iyzipay.com',
    //   }),
    //   inject: [ConfigService],
    // },
    {
      provide: 'IyzicoConfig',
      useFactory: (configService: ConfigService) =>
        configService.get('payment.iyzico'),
      inject: [ConfigService],
    },
    {
      provide: 'StripeConfig',
      useFactory: (configService: ConfigService) =>
        configService.get('payment.stripe'),
      inject: [ConfigService],
    },
    PaymentsService,
    StripePaymentStrategy,
    IyzicoPaymentStrategy,
  ],
  exports: [IyzicoPaymentStrategy, StripePaymentStrategy],
})
export class PaymentsModule {}
