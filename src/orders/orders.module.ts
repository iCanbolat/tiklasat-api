import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrderListener } from './listeners/order.listener';

@Module({
  controllers: [OrdersController],
  providers: [OrdersService, OrderListener],
})
export class OrdersModule {}
