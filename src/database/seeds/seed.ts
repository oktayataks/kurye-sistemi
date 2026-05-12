import { NestFactory } from '@nestjs/core';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { AppModule } from '../../app.module';
import { User, UserRole } from '../../users/user.entity';
import { Restaurant } from '../../restaurants/restaurant.entity';
import { Courier } from '../../couriers/courier.entity';
import { Order, OrderStatus } from '../../orders/order.entity';

import {
  ADMIN,
  RESTAURANTS,
  COURIERS,
  CUSTOMER_FIRST_NAMES,
  CUSTOMER_LAST_NAMES,
  STREETS,
  NEIGHBORHOODS,
  ORDER_NOTES,
} from './data';

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function randomInt(min: number, max: number): number {
  return Math.floor(randomBetween(min, max + 1));
}

function jitter(value: number, range = 0.005): number {
  return value + (Math.random() - 0.5) * range * 2;
}

function buildCustomerPhone(): string {
  let phone = '0555';
  for (let i = 0; i < 7; i++) phone += randomInt(0, 9).toString();
  return phone;
}

function buildDeliveryAddress() {
  const neighborhood = pick(NEIGHBORHOODS);
  const street = pick(STREETS);
  const doorNo = randomInt(1, 250);
  const apt = randomInt(1, 30);
  return {
    text: `${street} No:${doorNo} D:${apt}, ${neighborhood.name}`,
    lat: jitter(neighborhood.lat, 0.01),
    lng: jitter(neighborhood.lng, 0.01),
  };
}

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(randomInt(10, 22), randomInt(0, 59), randomInt(0, 59), 0);
  return d;
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

async function seed() {
  const start = Date.now();
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  const dataSource = app.get(DataSource);
  const userRepo = app.get<Repository<User>>(getRepositoryToken(User));
  const restaurantRepo = app.get<Repository<Restaurant>>(
    getRepositoryToken(Restaurant),
  );
  const courierRepo = app.get<Repository<Courier>>(getRepositoryToken(Courier));
  const orderRepo = app.get<Repository<Order>>(getRepositoryToken(Order));

  console.log('\n🌱  Seed başlıyor...\n');

  console.log('🧹  Mevcut veriler temizleniyor...');
  await dataSource.query(
    'TRUNCATE TABLE "orders", "couriers", "restaurants", "users" RESTART IDENTITY CASCADE',
  );

  console.log('👤  Admin kullanıcı oluşturuluyor...');
  const admin = userRepo.create({
    email: ADMIN.email,
    password: await bcrypt.hash(ADMIN.password, 10),
    fullName: ADMIN.fullName,
    phone: ADMIN.phone,
    role: UserRole.ADMIN,
    isActive: true,
  });
  await userRepo.save(admin);

  console.log(`🍽️   ${RESTAURANTS.length} restoran oluşturuluyor...`);
  const restaurants: Restaurant[] = [];
  for (const r of RESTAURANTS) {
    const owner = userRepo.create({
      email: r.ownerEmail,
      password: await bcrypt.hash(r.password, 10),
      fullName: r.ownerFullName,
      phone: r.ownerPhone,
      role: UserRole.RESTAURANT,
      isActive: true,
    });
    const savedOwner = await userRepo.save(owner);

    const restaurant = restaurantRepo.create({
      name: r.name,
      address: r.address,
      phone: r.phone,
      latitude: r.latitude,
      longitude: r.longitude,
      userId: savedOwner.id,
      isActive: true,
    });
    restaurants.push(await restaurantRepo.save(restaurant));
  }

  console.log(`🛵  ${COURIERS.length} kurye oluşturuluyor...`);
  const couriers: Courier[] = [];
  for (const c of COURIERS) {
    const courierUser = userRepo.create({
      email: c.email,
      password: await bcrypt.hash(c.password, 10),
      fullName: c.fullName,
      phone: c.phone,
      role: UserRole.COURIER,
      isActive: true,
    });
    const savedUser = await userRepo.save(courierUser);

    const courier = courierRepo.create({
      userId: savedUser.id,
      vehicleType: c.vehicleType,
      latitude: c.latitude,
      longitude: c.longitude,
      isOnline: c.isOnline,
      rating: c.rating,
      currentOrders: 0,
    });
    couriers.push(await courierRepo.save(courier));
  }

  const onlineCouriers = couriers.filter((c) => c.isOnline);

  console.log('📦  20 sipariş oluşturuluyor...');
  const statusPlan: OrderStatus[] = [
    OrderStatus.PENDING,
    OrderStatus.PENDING,
    OrderStatus.PENDING,
    OrderStatus.PENDING,
    OrderStatus.PENDING,
    OrderStatus.ASSIGNED,
    OrderStatus.ASSIGNED,
    OrderStatus.ASSIGNED,
    OrderStatus.ASSIGNED,
    OrderStatus.PICKED_UP,
    OrderStatus.PICKED_UP,
    OrderStatus.PICKED_UP,
    OrderStatus.DELIVERED,
    OrderStatus.DELIVERED,
    OrderStatus.DELIVERED,
    OrderStatus.DELIVERED,
    OrderStatus.DELIVERED,
    OrderStatus.DELIVERED,
    OrderStatus.CANCELLED,
    OrderStatus.CANCELLED,
  ];

  const courierActiveCount = new Map<string, number>();

  for (let i = 0; i < statusPlan.length; i++) {
    const status = statusPlan[i];
    const restaurant = pick(restaurants);
    const customerName = `${pick(CUSTOMER_FIRST_NAMES)} ${pick(CUSTOMER_LAST_NAMES)}`;
    const address = buildDeliveryAddress();
    const orderTotal = Math.round(randomBetween(80, 300) * 100) / 100;
    const deliveryFee = Math.round(randomBetween(10, 35) * 100) / 100;

    const createdAt = daysAgo(randomInt(0, 6));

    const order = orderRepo.create({
      restaurantId: restaurant.id,
      customerName,
      customerPhone: buildCustomerPhone(),
      deliveryAddress: address.text,
      deliveryLatitude: address.lat,
      deliveryLongitude: address.lng,
      orderTotal,
      deliveryFee,
      status,
      notes: pick(ORDER_NOTES) ?? undefined,
    });

    if (status !== OrderStatus.PENDING) {
      const courier = pick(onlineCouriers);
      order.courierId = courier.id;
      order.assignedAt = addMinutes(createdAt, randomInt(2, 15));

      if (status === OrderStatus.PICKED_UP) {
        order.pickedUpAt = addMinutes(order.assignedAt, randomInt(5, 20));
      }

      if (status === OrderStatus.DELIVERED) {
        order.pickedUpAt = addMinutes(order.assignedAt, randomInt(5, 20));
        order.deliveredAt = addMinutes(order.pickedUpAt, randomInt(15, 45));
      }

      if (status === OrderStatus.CANCELLED) {
        order.cancelledAt = addMinutes(order.assignedAt, randomInt(5, 30));
      }

      if (status === OrderStatus.ASSIGNED || status === OrderStatus.PICKED_UP) {
        courierActiveCount.set(
          courier.id,
          (courierActiveCount.get(courier.id) ?? 0) + 1,
        );
      }
    }

    const saved = await orderRepo.save(order);
    await orderRepo.update(saved.id, { createdAt });
  }

  for (const [courierId, count] of courierActiveCount.entries()) {
    await courierRepo.update(courierId, { currentOrders: count });
  }

  const totals = {
    users: await userRepo.count(),
    restaurants: await restaurantRepo.count(),
    couriers: await courierRepo.count(),
    onlineCouriers: await courierRepo.count({ where: { isOnline: true } }),
    orders: await orderRepo.count(),
  };

  console.log('\n✅  Seed tamamlandı!');
  console.log('────────────────────────────────────');
  console.log(`👥  Kullanıcılar       : ${totals.users}`);
  console.log(`🍽️   Restoranlar        : ${totals.restaurants}`);
  console.log(`🛵  Kuryeler          : ${totals.couriers} (${totals.onlineCouriers} online)`);
  console.log(`📦  Siparişler        : ${totals.orders}`);
  console.log('────────────────────────────────────');
  console.log('\n🔐  Giriş bilgileri:');
  console.log(`   Admin       → ${ADMIN.email} / ${ADMIN.password}`);
  console.log(`   Restoran    → ${RESTAURANTS[0].ownerEmail} / ${RESTAURANTS[0].password}`);
  console.log(`   Kurye       → ${COURIERS[0].email} / ${COURIERS[0].password}`);
  console.log(`\n⏱️   Süre: ${((Date.now() - start) / 1000).toFixed(2)}s\n`);

  await app.close();
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌  Seed başarısız:');
    console.error(err);
    process.exit(1);
  });
