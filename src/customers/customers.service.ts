import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Customer } from './customer.entity';
import { Restaurant } from '../restaurants/restaurant.entity';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private customersRepository: Repository<Customer>,
    @InjectRepository(Restaurant)
    private restaurantsRepository: Repository<Restaurant>,
  ) {}

  async getRestaurantByUserId(userId: string): Promise<Restaurant | null> {
    return this.restaurantsRepository.findOne({
      where: { userId },
    });
  }

  async findAll(userId: string, role: string, search?: string) {
    let restaurantId: string | null = null;

    if (role === 'restaurant') {
      const restaurant = await this.getRestaurantByUserId(userId);
      if (!restaurant) return [];
      restaurantId = restaurant.id;
    }

    const where: any = {};
    if (restaurantId) where.restaurantId = restaurantId;

    if (search) {
      return this.customersRepository.find({
        where: [
          { ...where, name: ILike(`%${search}%`) },
          { ...where, phone: ILike(`%${search}%`) },
        ],
        order: { orderCount: 'DESC', createdAt: 'DESC' },
      });
    }

    return this.customersRepository.find({
      where,
      order: { orderCount: 'DESC', createdAt: 'DESC' },
    });
  }

  async findByPhone(userId: string, phone: string) {
    const restaurant = await this.getRestaurantByUserId(userId);
    if (!restaurant) return null;

    const cleanPhone = phone.replace(/[^0-9]/g, '');
    return this.customersRepository.findOne({
      where: {
        restaurantId: restaurant.id,
        phone: ILike(`%${cleanPhone.slice(-10)}%`),
      },
    });
  }

  async create(userId: string, data: any) {
    const restaurant = await this.getRestaurantByUserId(userId);
    if (!restaurant) {
      throw new NotFoundException('Restoran kaydı bulunamadı');
    }

    const customer = this.customersRepository.create({
      ...data,
      restaurantId: restaurant.id,
    });

    return this.customersRepository.save(customer);
  }

  async update(id: string, data: any) {
    await this.customersRepository.update(id, data);
    return this.customersRepository.findOne({ where: { id } });
  }

  async incrementOrderCount(restaurantId: string, phone: string) {
    const customer = await this.customersRepository.findOne({
      where: { restaurantId, phone },
    });
    if (customer) {
      customer.orderCount += 1;
      await this.customersRepository.save(customer);
    }
  }

  async remove(id: string) {
    await this.customersRepository.delete(id);
    return { success: true };
  }
}
