import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThanOrEqual, Repository } from 'typeorm';
import { Order, OrderStatus } from './order.entity';
import { Courier } from '../couriers/courier.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { UserRole, User } from '../users/user.entity';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Courier)
    private readonly couriersRepository: Repository<Courier>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(createOrderDto: CreateOrderDto): Promise<Order> {
    try {
      const order = this.orderRepository.create(createOrderDto);
      return await this.orderRepository.save(order);
    } catch (error) {
      throw new InternalServerErrorException('Sipariş oluşturulurken hata oluştu');
    }
  }

  async findAll(
    pagination: PaginationDto,
    user: User,
    restaurantId?: string,
    courierId?: string,
  ): Promise<PaginatedResult<Order>> {
    try {
      const { page = 1, limit = 20 } = pagination;
      const skip = (page - 1) * limit;

      const where: any = {};

      if (user.role === UserRole.RESTAURANT && restaurantId) {
        where.restaurantId = restaurantId;
      } else if (user.role === UserRole.COURIER && courierId) {
        where.courierId = courierId;
      }

      const [data, total] = await this.orderRepository.findAndCount({
        where,
        relations: ['restaurant', 'courier', 'courier.user'],
        skip,
        take: limit,
        order: { createdAt: 'DESC' },
      });

      return {
        data,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw new InternalServerErrorException('Siparişler listelenirken hata oluştu');
    }
  }

  async findOne(id: string): Promise<Order> {
    try {
      const order = await this.orderRepository.findOne({
        where: { id },
        relations: ['restaurant', 'courier', 'courier.user'],
      });
      if (!order) {
        throw new NotFoundException(`Sipariş bulunamadı: ${id}`);
      }
      return order;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Sipariş getirilirken hata oluştu');
    }
  }

  async updateStatus(
    id: string,
    updateStatusDto: UpdateOrderStatusDto,
  ): Promise<Order> {
    try {
      const order = await this.findOne(id);

      this.validateStatusTransition(order.status, updateStatusDto.status);
      order.status = updateStatusDto.status;

      if (updateStatusDto.status === OrderStatus.ASSIGNED) {
        if (!updateStatusDto.courierId) {
          throw new BadRequestException('ASSIGNED durumu için courierId gereklidir');
        }
        order.courierId = updateStatusDto.courierId;
        order.assignedAt = new Date();
      }

      if (updateStatusDto.status === OrderStatus.PICKED_UP) {
        order.pickedUpAt = new Date();
      }

      if (updateStatusDto.status === OrderStatus.DELIVERED) {
        order.deliveredAt = new Date();
      }

      if (updateStatusDto.status === OrderStatus.CANCELLED) {
        order.cancelledAt = new Date();
      }

      return await this.orderRepository.save(order);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      )
        throw error;
      throw new InternalServerErrorException('Sipariş durumu güncellenirken hata oluştu');
    }
  }

  async remove(id: string): Promise<{ message: string }> {
    try {
      const order = await this.findOne(id);

      if (order.status !== OrderStatus.PENDING) {
        throw new ForbiddenException(
          `Sadece 'pending' durumundaki siparişler silinebilir. Mevcut durum: ${order.status}`,
        );
      }

      await this.orderRepository.remove(order);
      return { message: 'Sipariş başarıyla silindi' };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      )
        throw error;
      throw new InternalServerErrorException('Sipariş silinirken hata oluştu');
    }
  }

  async getAvailableOrders() {
    return this.orderRepository.find({
      where: { status: OrderStatus.PENDING, courierId: IsNull() },
      relations: ['restaurant'],
      order: { createdAt: 'DESC' },
    });
  }

  async getMyCourierOrders(userId: string) {
    const courier = await this.couriersRepository.findOne({
      where: { userId },
    });

    if (!courier) return [];

    return this.orderRepository.find({
      where: [
        { courierId: courier.id, status: OrderStatus.ASSIGNED },
        { courierId: courier.id, status: OrderStatus.PICKED_UP },
        { courierId: courier.id, status: OrderStatus.DELIVERED },
      ],
      relations: ['restaurant'],
      order: { createdAt: 'DESC' },
    });
  }

  async acceptOrder(orderId: string, userId: string) {
    const courier = await this.couriersRepository.findOne({
      where: { userId },
    });

    if (!courier) {
      throw new NotFoundException('Kurye bulunamadı');
    }

    const order = await this.orderRepository.findOne({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Sipariş bulunamadı');
    }

    if (order.status !== 'pending') {
      throw new BadRequestException('Bu sipariş zaten alınmış!');
    }

    order.courierId = courier.id;
    order.status = OrderStatus.ASSIGNED;
    order.assignedAt = new Date();

    await this.orderRepository.save(order);

    return order;
  }

  async autoAssignCourier(orderId: string) {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['restaurant'],
    });

    if (!order || order.status !== OrderStatus.PENDING) return null;

    const couriers = await this.couriersRepository.find({
      where: { isOnline: true, currentOrders: LessThanOrEqual(0) },
      relations: ['user'],
    });

    if (couriers.length === 0) {
      console.log('❌ Müsait kurye yok');
      return null;
    }

    const calculateDistance = (
      lat1: number, lon1: number,
      lat2: number, lon2: number,
    ): number => {
      if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
      const R = 6371;
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    const targetLat = Number(order.restaurant?.latitude ?? order.deliveryLatitude);
    const targetLng = Number(order.restaurant?.longitude ?? order.deliveryLongitude);

    let nearestCourier: Courier | null = null;
    let minDistance = Infinity;

    for (const courier of couriers) {
      if (!courier.latitude || !courier.longitude) continue;
      const dist = calculateDistance(
        Number(courier.latitude), Number(courier.longitude),
        targetLat, targetLng,
      );
      if (dist < minDistance) {
        minDistance = dist;
        nearestCourier = courier;
      }
    }

    // Konum bilgisi olmayan kuryeler varsa ilkini seç
    if (!nearestCourier) nearestCourier = couriers[0];

    order.courierId = nearestCourier.id;
    order.status = OrderStatus.ASSIGNED;
    order.assignedAt = new Date();
    await this.orderRepository.save(order);

    nearestCourier.currentOrders = (nearestCourier.currentOrders || 0) + 1;
    await this.couriersRepository.save(nearestCourier);

    console.log(
      `✅ Otomatik atama: Sipariş #${order.orderNumber} → ${nearestCourier.user?.fullName} (${isFinite(minDistance) ? minDistance.toFixed(2) + ' km' : 'konum yok'})`,
    );

    if (nearestCourier.fcmToken) {
      await this.notificationsService.sendNewOrderNotification(
        [nearestCourier.fcmToken],
        String(order.orderNumber),
        order.id,
      );
    }

    return nearestCourier;
  }

  private validateStatusTransition(
    current: OrderStatus,
    next: OrderStatus,
  ): void {
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]: [OrderStatus.ASSIGNED, OrderStatus.CANCELLED],
      [OrderStatus.ASSIGNED]: [OrderStatus.PICKED_UP, OrderStatus.CANCELLED],
      [OrderStatus.PICKED_UP]: [OrderStatus.DELIVERED],
      [OrderStatus.DELIVERED]: [],
      [OrderStatus.CANCELLED]: [],
    };

    if (!validTransitions[current].includes(next)) {
      throw new BadRequestException(
        `Geçersiz durum geçişi: "${current}" → "${next}". İzin verilenler: ${validTransitions[current].join(', ') || 'yok'}`,
      );
    }
  }
}
