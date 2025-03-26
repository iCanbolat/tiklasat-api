import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrderListener } from 'src/common/listeners/order.listener';
import { MailModule } from 'src/mail/mail.module';

@Module({
  imports: [MailModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrderListener],
  exports: [OrdersService],
})
export class OrdersModule {}
