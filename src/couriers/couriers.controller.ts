import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { CouriersService } from './couriers.service';
import { CreateCourierDto } from './dto/create-courier.dto';
import { CreateCourierWithUserDto } from './dto/create-courier-with-user.dto';
import { UpdateCourierDto } from './dto/update-courier.dto';
import { UpdateCourierLocationDto } from './dto/update-courier-location.dto';
import { UpdateCourierStatusDto } from './dto/update-courier-status.dto';
import { CourierFilterDto } from './dto/courier-filter.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';

@ApiTags('Kuryeler')
@ApiBearerAuth('JWT')
@Controller('couriers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CouriersController {
  constructor(private readonly couriersService: CouriersService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Yeni kurye ekle — mevcut User\'a bağla (Admin)' })
  @ApiResponse({ status: 201, description: 'Kurye oluşturuldu' })
  create(@Body() createCourierDto: CreateCourierDto) {
    return this.couriersService.create(createCourierDto);
  }

  @Post('with-user')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Yeni kurye ekle — User + Courier tek adımda (Admin)',
    description:
      'Sisteme yeni bir kullanıcı (rol: courier) ve aynı zamanda kurye profili oluşturur. ' +
      'Email çakışması varsa 409 döner. İşlem tek transaction içinde yapılır.',
  })
  @ApiResponse({ status: 201, description: 'Kullanıcı + kurye oluşturuldu' })
  @ApiResponse({ status: 409, description: 'E-posta zaten kullanılıyor' })
  createWithUser(@Body() dto: CreateCourierWithUserDto) {
    return this.couriersService.createWithUser(dto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.RESTAURANT)
  @ApiOperation({ summary: 'Kurye listesi (isOnline filtresi opsiyonel)' })
  @ApiResponse({ status: 200, description: 'Kurye listesi' })
  findAll(@Query() filters: CourierFilterDto) {
    const isOnlineFilter =
      filters.isOnline === 'true'
        ? true
        : filters.isOnline === 'false'
          ? false
          : undefined;

    return this.couriersService.findAll(
      { page: filters.page, limit: filters.limit },
      isOnlineFilter,
    );
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Kurye kendi profil bilgisini getir' })
  @ApiResponse({ status: 200, description: 'Kurye profili' })
  async getMyProfile(@Request() req) {
    console.log('🔍 getMyProfile çağrıldı, userId:', req.user.sub);
    return this.couriersService.findByUserId(req.user.sub);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.RESTAURANT)
  @ApiOperation({ summary: 'Kurye detayı getir' })
  @ApiResponse({ status: 200, description: 'Kurye bulundu' })
  @ApiResponse({ status: 404, description: 'Kurye bulunamadı' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.couriersService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.COURIER)
  @ApiOperation({ summary: 'Kurye bilgilerini güncelle' })
  @ApiResponse({ status: 200, description: 'Kurye güncellendi' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCourierDto: UpdateCourierDto,
  ) {
    return this.couriersService.update(id, updateCourierDto);
  }

  @Patch(':id/location')
  @Roles(UserRole.COURIER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Kurye konumunu güncelle' })
  @ApiResponse({ status: 200, description: 'Konum güncellendi' })
  updateLocation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() locationDto: UpdateCourierLocationDto,
  ) {
    return this.couriersService.updateLocation(id, locationDto.latitude, locationDto.longitude);
  }

  @Patch(':id/fcm-token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Kurye FCM token güncelle' })
  @ApiResponse({ status: 200, description: 'FCM token güncellendi' })
  async updateFcmToken(
    @Param('id') id: string,
    @Body() body: { fcmToken: string },
  ) {
    return this.couriersService.updateFcmToken(id, body.fcmToken);
  }

  @Patch(':id/status')
  @Roles(UserRole.COURIER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Kurye durumunu güncelle (online/offline)' })
  @ApiResponse({ status: 200, description: 'Durum güncellendi' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() statusDto: UpdateCourierStatusDto,
  ) {
    return this.couriersService.updateStatus(id, statusDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Kurye sil (Admin)' })
  @ApiResponse({ status: 200, description: 'Kurye silindi' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.couriersService.remove(id);
  }
}
