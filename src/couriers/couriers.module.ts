import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CouriersService } from './couriers.service';
import { CouriersController } from './couriers.controller';
import { Courier } from './courier.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Courier])],
  controllers: [CouriersController],
  providers: [CouriersService],
  exports: [CouriersService],
})
export class CouriersModule {}
