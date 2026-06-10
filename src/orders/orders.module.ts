import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { AssignmentService } from './services/assignment.service';
import { MockOrdersService } from './mock-orders.service';
import { Order } from './order.entity';
import { Courier } from '../couriers/courier.entity';
import { Restaurant } from '../restaurants/restaurant.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Order, Courier, Restaurant])],
  controllers: [OrdersController],
  providers: [OrdersService, AssignmentService, MockOrdersService],
  exports: [OrdersService, AssignmentService],
})
export class OrdersModule {}
