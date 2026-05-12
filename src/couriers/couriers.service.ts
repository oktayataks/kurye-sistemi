import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Courier } from './courier.entity';
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

  async updateLocation(
    id: string,
    locationDto: UpdateCourierLocationDto,
  ): Promise<Courier> {
    try {
      const courier = await this.findOne(id);
      courier.latitude = locationDto.latitude;
      courier.longitude = locationDto.longitude;
      return await this.courierRepository.save(courier);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Konum güncellenirken hata oluştu');
    }
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

  async remove(id: string): Promise<{ message: string }> {
    try {
      const courier = await this.findOne(id);
      await this.courierRepository.remove(courier);
      return { message: 'Kurye başarıyla silindi' };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Kurye silinirken hata oluştu');
    }
  }
}
