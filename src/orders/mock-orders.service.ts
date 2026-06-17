import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from './order.entity';
import { Courier } from '../couriers/courier.entity';
import { Restaurant } from '../restaurants/restaurant.entity';
import { Cron } from '@nestjs/schedule';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class MockOrdersService {
  constructor(
    @InjectRepository(Order)
    private ordersRepository: Repository<Order>,
    @InjectRepository(Courier)
    private couriersRepository: Repository<Courier>,
    @InjectRepository(Restaurant)
    private restaurantsRepository: Repository<Restaurant>,
    private notificationsService: NotificationsService,
  ) {}

  private mockCustomers = [
    { name: 'Ahmet Yılmaz', phone: '0532 111 2233' },
    { name: 'Ayşe Demir', phone: '0543 222 3344' },
    { name: 'Mehmet Kaya', phone: '0555 333 4455' },
    { name: 'Fatma Şahin', phone: '0534 444 5566' },
    { name: 'Ali Öztürk', phone: '0544 555 6677' },
    { name: 'Zeynep Çelik', phone: '0556 666 7788' },
    { name: 'Mustafa Arslan', phone: '0535 777 8899' },
    { name: 'Emine Kurt', phone: '0545 888 9900' },
  ];

  private mockAddresses = [
    { address: 'Kadıköy Moda Cad. No:15 Daire:3', lat: 40.9877, lng: 29.0255 },
    { address: 'Beşiktaş Barbaros Bulvarı No:42', lat: 41.0432, lng: 29.0088 },
    { address: 'Üsküdar Bağlarbaşı Cad. No:8', lat: 41.0218, lng: 29.0175 },
    { address: 'Şişli Halaskargazi Cad. No:55', lat: 41.0602, lng: 28.9877 },
    { address: 'Maltepe Bağdat Cad. No:123', lat: 40.9354, lng: 29.1332 },
    { address: 'Ataşehir Atatürk Mah. No:67', lat: 40.9923, lng: 29.1244 },
    { address: 'Pendik Yeni Mah. No:34', lat: 40.8742, lng: 29.2576 },
    { address: 'Bakırköy İstasyon Cad. No:12', lat: 40.9812, lng: 28.8742 },
  ];

  private mockSources = [
    'Yemeksepeti',
    'Getir',
    'Trendyol Yemek',
    'Manuel',
  ];

  @Cron('*/2 * * * *')
  async generateMockOrder() {
    try {
      const restaurants = await this.restaurantsRepository.find();
      if (restaurants.length === 0) return;

      const restaurant = restaurants[Math.floor(Math.random() * restaurants.length)];
      const customer = this.mockCustomers[Math.floor(Math.random() * this.mockCustomers.length)];
      const deliveryAddress = this.mockAddresses[Math.floor(Math.random() * this.mockAddresses.length)];
      const source = this.mockSources[Math.floor(Math.random() * this.mockSources.length)];

      const orderTotal = Math.floor(Math.random() * 200 + 50);
      const deliveryFee = Math.floor(Math.random() * 20 + 10);

      const order = this.ordersRepository.create({
        restaurantId: restaurant.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        deliveryAddress: deliveryAddress.address,
        deliveryLatitude: deliveryAddress.lat,
        deliveryLongitude: deliveryAddress.lng,
        orderTotal,
        deliveryFee,
        status: OrderStatus.PENDING,
        notes: `${source} siparişi`,
      });

      const saved = await this.ordersRepository.save(order);
      console.log(`✅ Mock sipariş oluşturuldu: #${saved.orderNumber} - ${customer.name}`);

      const onlineCouriers = await this.couriersRepository.find({
        where: { isOnline: true },
      });
      const tokens = onlineCouriers
        .filter((c) => c.fcmToken)
        .map((c) => c.fcmToken);

      if (tokens.length > 0) {
        await this.notificationsService.sendNewOrderNotification(
          tokens,
          String(saved.orderNumber),
          saved.id,
        );
      }

    } catch (error) {
      console.error('Mock sipariş oluşturulamadı:', error);
    }
  }

  async generateSingleOrder() {
    await this.generateMockOrder();
    return { message: 'Mock sipariş oluşturuldu!' };
  }
}
