import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThan, Repository } from 'typeorm';
import { Order, OrderStatus } from './order.entity';
import { OrdersService } from './orders.service';

@Injectable()
export class AutoAssignService {
  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    private readonly ordersService: OrdersService,
  ) {}

  @Cron('*/10 * * * * *')
  async assignPendingOrders() {
    // Teklif edilmemiş pending siparişlere kurye bul
    const pendingOrders = await this.ordersRepository.find({
      where: { status: OrderStatus.PENDING, offeredCourierId: IsNull() },
    });

    for (const order of pendingOrders) {
      await this.ordersService.offerOrderToCourier(order.id);
    }

    // 30 saniyedir yanıtlanmayan teklifleri zaman aşımına uğrat
    const thirtySecondsAgo = new Date(Date.now() - 30000);
    const expiredOffers = await this.ordersRepository
      .createQueryBuilder('order')
      .where('order.offeredAt < :time', { time: thirtySecondsAgo })
      .andWhere('order.status = :status', { status: OrderStatus.PENDING })
      .andWhere('order.offeredCourierId IS NOT NULL')
      .getMany();

    for (const order of expiredOffers) {
      await this.ordersService.rejectOffer(order.id, order.offeredCourierId, true);
    }
  }
}
