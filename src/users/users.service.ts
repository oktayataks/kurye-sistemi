import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './user.entity';
import { Courier } from '../couriers/courier.entity';
import { Restaurant } from '../restaurants/restaurant.entity';
import { Order } from '../orders/order.entity';
import { Customer } from '../customers/customer.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Courier)
    private readonly couriersRepository: Repository<Courier>,
    @InjectRepository(Restaurant)
    private readonly restaurantsRepository: Repository<Restaurant>,
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    @InjectRepository(Customer)
    private readonly customersRepository: Repository<Customer>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const existing = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });
    if (existing) {
      throw new ConflictException('Bu e-posta zaten kullanılıyor');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const user = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });
    return this.userRepository.save(user);
  }

  async findAll(): Promise<User[]> {
    return this.userRepository.find({
      select: ['id', 'email', 'fullName', 'phone', 'role', 'isActive', 'createdAt'],
    });
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`Kullanıcı bulunamadı: ${id}`);
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);
    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }
    Object.assign(user, updateUserDto);
    return this.userRepository.save(user);
  }

  async remove(id: string): Promise<{ success: boolean }> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı');
    }

    // Son admin koruması
    if (user.role === 'admin') {
      const adminCount = await this.userRepository.count({ where: { role: 'admin' } as any });
      if (adminCount <= 1) {
        throw new BadRequestException('Son admin silinemez! En az bir admin kalmalı.');
      }
    }

    // Kurye rolü → kurye kaydını temizle
    if (user.role === 'courier') {
      const courier = await this.couriersRepository.findOne({ where: { userId: id } });
      if (courier) {
        const activeOrders = await this.ordersRepository.count({
          where: { courierId: courier.id, status: In(['assigned', 'picked_up']) },
        });
        if (activeOrders > 0) {
          throw new BadRequestException(
            `Bu kuryenin ${activeOrders} aktif siparişi var. Önce tamamlayın.`,
          );
        }
        await this.ordersRepository.update({ courierId: courier.id }, { courierId: null });
        await this.couriersRepository.delete(courier.id);
      }
    }

    // Restoran rolü → restoran kaydını temizle
    if (user.role === 'restaurant') {
      const restaurant = await this.restaurantsRepository.findOne({ where: { userId: id } });
      if (restaurant) {
        const activeOrders = await this.ordersRepository.count({
          where: {
            restaurantId: restaurant.id,
            status: In(['pending', 'assigned', 'picked_up']),
          },
        });
        if (activeOrders > 0) {
          throw new BadRequestException(
            `Bu restoranın ${activeOrders} aktif siparişi var. Önce tamamlayın.`,
          );
        }
        await this.customersRepository.delete({ restaurantId: restaurant.id });
        await this.restaurantsRepository.delete(restaurant.id);
      }
    }

    await this.userRepository.delete(id);
    return { success: true };
  }
}
