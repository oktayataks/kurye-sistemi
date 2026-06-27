import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Courier } from './courier.entity';
import { Order } from '../orders/order.entity';
import { CreateCourierDto } from './dto/create-courier.dto';
import { CreateCourierWithUserDto } from './dto/create-courier-with-user.dto';
import { UpdateCourierDto } from './dto/update-courier.dto';
import { UpdateCourierLocationDto } from './dto/update-courier-location.dto';
import { UpdateCourierStatusDto } from './dto/update-courier-status.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { User, UserRole } from '../users/user.entity';

@Injectable()
export class CouriersService {
  constructor(
    @InjectRepository(Courier)
    private readonly courierRepository: Repository<Courier>,
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  async create(createCourierDto: CreateCourierDto): Promise<Courier> {
    try {
      const courier = this.courierRepository.create(createCourierDto);
      return await this.courierRepository.save(courier);
    } catch (error) {
      throw new InternalServerErrorException('Kurye oluşturulurken hata oluştu');
    }
  }

  /**
   * Tek adımda hem `users` hem de `couriers` kaydı oluşturur.
   * Email çakışması varsa 409 ConflictException döner.
   * İki kayıttan biri başarısız olursa transaction geri alınır.
   */
  async createWithUser(dto: CreateCourierWithUserDto): Promise<Courier> {
    return this.dataSource.transaction(async (manager) => {
      const userRepo = manager.getRepository(User);
      const courierRepo = manager.getRepository(Courier);

      const existing = await userRepo.findOne({
        where: { email: dto.email.toLowerCase() },
      });
      if (existing) {
        throw new ConflictException('Bu e-posta zaten kullanılıyor');
      }

      const hashedPassword = await bcrypt.hash(dto.password, 10);
      const user = userRepo.create({
        email: dto.email.toLowerCase(),
        password: hashedPassword,
        fullName: dto.fullName,
        phone: dto.phone,
        role: UserRole.COURIER,
        isActive: true,
      });
      const savedUser = await userRepo.save(user);

      const courier = courierRepo.create({
        userId: savedUser.id,
        vehicleType: dto.vehicleType,
        latitude: dto.latitude,
        longitude: dto.longitude,
        isOnline: false,
        currentOrders: 0,
        rating: 0,
      });
      const savedCourier = await courierRepo.save(courier);

      return courierRepo.findOneOrFail({
        where: { id: savedCourier.id },
        relations: ['user'],
      });
    });
  }

  async findAll(
    pagination: PaginationDto,
    isOnline?: boolean,
  ): Promise<PaginatedResult<Courier>> {
    try {
      const { page = 1, limit = 20 } = pagination;
      const skip = (page - 1) * limit;

      const where: any = {};
      if (isOnline !== undefined) {
        where.isOnline = isOnline;
      }

      const [data, total] = await this.courierRepository.findAndCount({
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
      throw new InternalServerErrorException('Kuryeler listelenirken hata oluştu');
    }
  }

  async findByUserId(userId: string) {
    console.log('🔍 findByUserId çağrıldı:', userId);

    const courier = await this.courierRepository.findOne({
      where: { userId },
      relations: ['user'],
    });

    console.log('🔍 Bulunan courier:', courier?.id);
    return courier;
  }

  async findOne(id: string): Promise<Courier> {
    try {
      const courier = await this.courierRepository.findOne({
        where: { id },
        relations: ['user', 'orders'],
      });
      if (!courier) {
        throw new NotFoundException(`Kurye bulunamadı: ${id}`);
      }
      return courier;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Kurye getirilirken hata oluştu');
    }
  }

  async update(id: string, updateCourierDto: UpdateCourierDto): Promise<Courier> {
    try {
      const courier = await this.findOne(id);
      Object.assign(courier, updateCourierDto);
      return await this.courierRepository.save(courier);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Kurye güncellenirken hata oluştu');
    }
  }

  async updateLocation(id: string, latitude: number, longitude: number) {
    await this.courierRepository.update(id, {
      latitude,
      longitude,
    });
    return { success: true };
  }

  async updateStatus(
    id: string,
    statusDto: UpdateCourierStatusDto,
  ): Promise<Courier> {
    try {
      const courier = await this.findOne(id);
      courier.isOnline = statusDto.isOnline;
      return await this.courierRepository.save(courier);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Durum güncellenirken hata oluştu');
    }
  }

  async updateFcmToken(id: string, fcmToken: string) {
    await this.courierRepository.update(id, { fcmToken });
    return { success: true };
  }

  async startBreak(userId: string, minutes: number) {
    const courier = await this.courierRepository.findOne({ where: { userId } });
    if (!courier) throw new NotFoundException('Kurye bulunamadı');

    const breakUntil = new Date();
    breakUntil.setMinutes(breakUntil.getMinutes() + minutes);

    courier.breakUntil = breakUntil;
    courier.isOnline = false;
    await this.courierRepository.save(courier);

    return { success: true, breakUntil };
  }

  async endBreak(userId: string) {
    const courier = await this.courierRepository.findOne({ where: { userId } });
    if (!courier) throw new NotFoundException('Kurye bulunamadı');

    if (courier.breakUntil && new Date(courier.breakUntil) > new Date()) {
      return {
        success: false,
        message: 'Mola süresi henüz bitmedi',
        breakUntil: courier.breakUntil,
      };
    }

    courier.breakUntil = null;
    courier.isOnline = true;
    await this.courierRepository.save(courier);

    return { success: true };
  }

  async remove(id: string): Promise<{ success: boolean }> {
    try {
      const courier = await this.courierRepository.findOne({
        where: { id },
        relations: ['user'],
      });

      if (!courier) {
        throw new NotFoundException('Kurye bulunamadı');
      }

      console.log('🗑️ Kurye siliniyor:', courier.user?.fullName, id);

      const activeOrders = await this.ordersRepository.count({
        where: { courierId: id, status: In(['assigned', 'picked_up']) },
      });

      console.log('📋 Aktif siparişler:', activeOrders);

      if (activeOrders > 0) {
        throw new BadRequestException(
          `Bu kuryenin ${activeOrders} aktif siparişi var.`,
        );
      }

      console.log('🔄 courierId temizleniyor...');
      await this.ordersRepository.update({ courierId: id }, { courierId: null });

      console.log('🗑️ Kurye kaydı siliniyor...');
      await this.courierRepository.delete(id);

      if (courier.userId) {
        console.log('👤 User siliniyor:', courier.userId);
        await this.usersRepository.delete(courier.userId);
      }

      console.log('✅ Silme başarılı!');
      return { success: true };
    } catch (error) {
      console.error('❌ KURYE SİLME HATASI:', error);
      console.error('Stack:', error.stack);
      throw error;
    }
  }
}
