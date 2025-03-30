import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrderListener } from 'src/common/listeners/order.listener';
import { MailModule } from 'src/mail/mail.module';
import { ProductsModule } from 'src/products/products.module';

@Module({
  imports: [MailModule, ProductsModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrderListener],
  exports: [OrdersService],
})
export class OrdersModule {}
