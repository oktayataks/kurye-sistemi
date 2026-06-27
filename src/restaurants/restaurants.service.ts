import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Restaurant } from './restaurant.entity';
import { Order } from '../orders/order.entity';
import { Customer } from '../customers/customer.entity';
import { User } from '../users/user.entity';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';

@Injectable()
export class RestaurantsService {
  constructor(
    @InjectRepository(Restaurant)
    private readonly restaurantRepository: Repository<Restaurant>,
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    @InjectRepository(Customer)
    private readonly customersRepository: Repository<Customer>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async create(createRestaurantDto: CreateRestaurantDto): Promise<Restaurant> {
    try {
      const restaurant = this.restaurantRepository.create(createRestaurantDto);
      return await this.restaurantRepository.save(restaurant);
    } catch (error) {
      throw new InternalServerErrorException('Restoran oluşturulurken hata oluştu');
    }
  }

  async findAll(
    pagination: PaginationDto,
    userId?: string,
  ): Promise<PaginatedResult<Restaurant>> {
    try {
      const { page = 1, limit = 20 } = pagination;
      const skip = (page - 1) * limit;

      const where: any = {};
      if (userId) {
        where.userId = userId;
      }

      const [data, total] = await this.restaurantRepository.findAndCount({
        where,
        relations: ['user'],
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
      throw new InternalServerErrorException('Restoranlar listelenirken hata oluştu');
    }
  }

  async findOne(id: string): Promise<Restaurant> {
    try {
      const restaurant = await this.restaurantRepository.findOne({
        where: { id },
        relations: ['user'],
      });
      if (!restaurant) {
        throw new NotFoundException(`Restoran bulunamadı: ${id}`);
      }
      return restaurant;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Restoran getirilirken hata oluştu');
    }
  }

  async update(
    id: string,
    updateRestaurantDto: UpdateRestaurantDto,
  ): Promise<Restaurant> {
    try {
      const restaurant = await this.findOne(id);
      Object.assign(restaurant, updateRestaurantDto);
      return await this.restaurantRepository.save(restaurant);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Restoran güncellenirken hata oluştu');
    }
  }

  async remove(id: string): Promise<{ success: boolean }> {
    const restaurant = await this.restaurantRepository.findOne({ where: { id } });
    if (!restaurant) {
      throw new NotFoundException('Restoran bulunamadı');
    }

    const activeOrders = await this.ordersRepository.count({
      where: { restaurantId: id, status: In(['pending', 'assigned', 'picked_up']) },
    });
    if (activeOrders > 0) {
      throw new BadRequestException(
        `Bu restoranın ${activeOrders} aktif siparişi var. Önce tamamlayın.`,
      );
    }

    await this.customersRepository.delete({ restaurantId: id });
    await this.restaurantRepository.delete(id);

    if (restaurant.userId) {
      await this.usersRepository.delete(restaurant.userId);
    }

    return { success: true };
  }
}
