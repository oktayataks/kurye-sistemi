import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from '../order.entity';
import { Courier } from '../../couriers/courier.entity';
import { Restaurant } from '../../restaurants/restaurant.entity';

const EARTH_RADIUS_KM = 6371;
const MAX_DISTANCE_KM = 20;
const MAX_CURRENT_ORDERS = 10;
const MAX_RATING = 5;

interface CourierScore {
  courier: Courier;
  distanceKm: number;
  distanceScore: number;
  loadScore: number;
  ratingScore: number;
  totalScore: number;
}

export interface AssignmentResult {
  order: Order;
  assignedCourier: Courier;
  scores: CourierScore[];
  message: string;
}

@Injectable()
export class AssignmentService {
  private readonly logger = new Logger(AssignmentService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,

    @InjectRepository(Courier)
    private readonly courierRepository: Repository<Courier>,

    @InjectRepository(Restaurant)
    private readonly restaurantRepository: Repository<Restaurant>,
  ) {}

  async findBestCourier(orderId: string): Promise<AssignmentResult> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['restaurant'],
    });

    if (!order) {
      throw new NotFoundException(`Sipariş bulunamadı: ${orderId}`);
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(
        `Sadece "pending" siparişlere kurye atanabilir. Mevcut durum: ${order.status}`,
      );
    }

    const restaurant = await this.restaurantRepository.findOne({
      where: { id: order.restaurantId },
    });

    if (!restaurant) {
      throw new NotFoundException(`Restoran bulunamadı: ${order.restaurantId}`);
    }

    if (!restaurant.latitude || !restaurant.longitude) {
      throw new BadRequestException(
        'Restoran konum bilgisi eksik, kurye ataması yapılamıyor',
      );
    }

    const onlineCouriers = await this.courierRepository.find({
      where: { isOnline: true },
      relations: ['user'],
    });

    if (onlineCouriers.length === 0) {
      throw new BadRequestException('Şu anda çevrimiçi kurye bulunmuyor');
    }

    const couriersWithLocation = onlineCouriers.filter(
      (c) => c.latitude != null && c.longitude != null,
    );

    if (couriersWithLocation.length === 0) {
      throw new BadRequestException(
        'Konum bilgisi olan çevrimiçi kurye bulunmuyor',
      );
    }

    const scores = this.calculateScores(
      couriersWithLocation,
      Number(restaurant.latitude),
      Number(restaurant.longitude),
    );

    scores.sort((a, b) => b.totalScore - a.totalScore);
    const best = scores[0];

    order.courierId = best.courier.id;
    order.status = OrderStatus.ASSIGNED;
    order.assignedAt = new Date();
    const updatedOrder = await this.orderRepository.save(order);

    best.courier.currentOrders += 1;
    await this.courierRepository.save(best.courier);

    this.notifyCourier(best.courier, updatedOrder, restaurant);
    this.notifyRestaurant(restaurant, best.courier, updatedOrder);

    this.logger.log(
      `✅ Sipariş #${order.orderNumber} → Kurye: ${best.courier.user?.fullName ?? best.courier.id} | ` +
      `Mesafe: ${best.distanceKm.toFixed(2)} km | Skor: ${best.totalScore.toFixed(4)}`,
    );

    return {
      order: updatedOrder,
      assignedCourier: best.courier,
      scores,
      message: `Sipariş başarıyla atandı. En iyi kurye skoru: ${best.totalScore.toFixed(4)}`,
    };
  }

  private calculateScores(
    couriers: Courier[],
    restaurantLat: number,
    restaurantLng: number,
  ): CourierScore[] {
    return couriers.map((courier) => {
      const distanceKm = this.haversineDistance(
        Number(courier.latitude),
        Number(courier.longitude),
        restaurantLat,
        restaurantLng,
      );

      const distanceScore = this.normalizeDistanceScore(distanceKm);
      const loadScore = this.normalizeLoadScore(courier.currentOrders);
      const ratingScore = this.normalizeRatingScore(Number(courier.rating));

      const totalScore =
        distanceScore * 0.5 + loadScore * 0.3 + ratingScore * 0.2;

      return {
        courier,
        distanceKm,
        distanceScore,
        loadScore,
        ratingScore,
        totalScore,
      };
    });
  }

  /**
   * Haversine formülü — iki koordinat arasındaki küresel mesafeyi km cinsinden hesaplar.
   */
  private haversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const toRad = (deg: number) => (deg * Math.PI) / 180;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

    const c = 2 * Math.asin(Math.sqrt(a));

    return EARTH_RADIUS_KM * c;
  }

  /**
   * Mesafe skoru: restorandan uzak kurye düşük skor alır.
   * MAX_DISTANCE_KM (20 km) ötesindeki kuryeler 0 puan alır.
   */
  private normalizeDistanceScore(distanceKm: number): number {
    if (distanceKm >= MAX_DISTANCE_KM) return 0;
    return (MAX_DISTANCE_KM - distanceKm) / MAX_DISTANCE_KM;
  }

  /**
   * Yük skoru: aktif sipariş sayısı az olan kurye daha yüksek skor alır.
   */
  private normalizeLoadScore(currentOrders: number): number {
    if (currentOrders >= MAX_CURRENT_ORDERS) return 0;
    return (MAX_CURRENT_ORDERS - currentOrders) / MAX_CURRENT_ORDERS;
  }

  /**
   * Rating skoru: puan 0-5 arasında normalize edilir.
   */
  private normalizeRatingScore(rating: number): number {
    if (rating <= 0) return 0;
    return Math.min(rating, MAX_RATING) / MAX_RATING;
  }

  private notifyCourier(
    courier: Courier,
    order: Order,
    restaurant: Restaurant,
  ): void {
    this.logger.log(
      `📱 [KURYE BİLDİRİMİ] → ${courier.user?.fullName ?? courier.id} | ` +
      `Yeni sipariş #${order.orderNumber} | ` +
      `Restoran: ${restaurant.name} (${restaurant.address}) | ` +
      `Teslimat: ${order.deliveryAddress}`,
    );
  }

  private notifyRestaurant(
    restaurant: Restaurant,
    courier: Courier,
    order: Order,
  ): void {
    this.logger.log(
      `🏪 [RESTORAN BİLDİRİMİ] → ${restaurant.name} | ` +
      `Sipariş #${order.orderNumber} kurye: ${courier.user?.fullName ?? courier.id} | ` +
      `Araç: ${courier.vehicleType} | ` +
      `Atanma: ${order.assignedAt?.toISOString()}`,
    );
  }
}
