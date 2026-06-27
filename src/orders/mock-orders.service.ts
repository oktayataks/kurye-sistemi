import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Order, OrderStatus } from './order.entity';
import { Courier } from '../couriers/courier.entity';
import { Restaurant } from '../restaurants/restaurant.entity';
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

  // Kartal (40.86, 29.33) merkez alınarak hazırlandı
  // Sınır içi (<5 km): sipariş teklifi gelmeli
  // Sınır dışı (>5 km): teklif gelmemeli
  private readonly MOCK_CUSTOMERS = [
    { name: 'Ahmet Yılmaz',  phone: '05551111111', address: 'Kartal Soğanlık Mah.',             lat: 40.8650, lng: 29.3250 },
    { name: 'Fatma Kaya',    phone: '05552222222', address: 'Kartal Cevizli Mah. Bağdat Cad. No:42', lat: 40.8810, lng: 29.3180 },
    { name: 'Mehmet Demir',  phone: '05553333333', address: 'Pendik Şeyhli Mah.',                lat: 40.8550, lng: 29.3700 },
    { name: 'Selin Öztürk',  phone: '05557777777', address: 'Maltepe Bağdat Cad. No:123',        lat: 40.8700, lng: 29.3050 },
    // Sınır dışı — teklif gelmemeli
    { name: 'Ali Şahin',     phone: '05554444444', address: 'Pendik Çamçeşme Mah.',              lat: 40.8800, lng: 29.2300 },
    { name: 'Zeynep Aydın',  phone: '05555555555', address: 'Tuzla Aydınlı Mah.',               lat: 40.8200, lng: 29.4500 },
    { name: 'Mustafa Arslan',phone: '05556666666', address: 'Gebze Hacı Halil Mah.',             lat: 40.7872, lng: 29.4307 },
  ];

  private readonly MOCK_SOURCES = ['Yemeksepeti', 'Getir', 'Trendyol Yemek', 'Manuel'];

  @Cron(CronExpression.EVERY_MINUTE)
  async generateMockOrder() {
    try {
      const restaurants = await this.restaurantsRepository.find();
      if (restaurants.length === 0) return;

      const customer = this.MOCK_CUSTOMERS[Math.floor(Math.random() * this.MOCK_CUSTOMERS.length)];
      const source = this.MOCK_SOURCES[Math.floor(Math.random() * this.MOCK_SOURCES.length)];
      const selectedRestaurant = restaurants[Math.floor(Math.random() * restaurants.length)];

      const orderTotal = Math.floor(Math.random() * 200 + 50);
      const deliveryFee = Math.floor(Math.random() * 20 + 10);

      const order = this.ordersRepository.create({
        restaurantId: selectedRestaurant.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        deliveryAddress: customer.address,
        deliveryLatitude: customer.lat,
        deliveryLongitude: customer.lng,
        orderTotal,
        deliveryFee,
        status: OrderStatus.PENDING,
        notes: `${source} siparişi`,
      });

      const saved = await this.ordersRepository.save(order);
      console.log(`✅ Mock sipariş oluşturuldu: #${saved.orderNumber} - ${customer.name} (${customer.lat}, ${customer.lng})`);
    } catch (error) {
      console.error('Mock sipariş oluşturulamadı:', error);
    }
  }

  async generateSingleOrder() {
    await this.generateMockOrder();
    return { message: 'Mock sipariş oluşturuldu!' };
  }
}
