import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { RestaurantsService } from './restaurants.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole, User } from '../users/user.entity';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('Restoranlar')
@ApiBearerAuth('JWT')
@Controller('restaurants')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RestaurantsController {
  constructor(private readonly restaurantsService: RestaurantsService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Yeni restoran oluştur (Admin)' })
  @ApiResponse({ status: 201, description: 'Restoran başarıyla oluşturuldu' })
  @ApiResponse({ status: 403, description: 'Yetkisiz erişim' })
  create(@Body() createRestaurantDto: CreateRestaurantDto) {
    return this.restaurantsService.create(createRestaurantDto);
  }

  @Get()
  @ApiOperation({ summary: 'Restoranları listele (Admin: tümü, Restaurant: kendisi)' })
  @ApiResponse({ status: 200, description: 'Restoran listesi' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @Query() pagination: PaginationDto,
    @CurrentUser() user: User,
  ) {
    const userId = user.role === UserRole.RESTAURANT ? user.id : undefined;
    return this.restaurantsService.findAll(pagination, userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Restoran detayı getir' })
  @ApiResponse({ status: 200, description: 'Restoran bulundu' })
  @ApiResponse({ status: 404, description: 'Restoran bulunamadı' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.restaurantsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.RESTAURANT)
  @ApiOperation({ summary: 'Restoran bilgilerini güncelle' })
  @ApiResponse({ status: 200, description: 'Restoran güncellendi' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateRestaurantDto: UpdateRestaurantDto,
  ) {
    return this.restaurantsService.update(id, updateRestaurantDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Restoran sil (Admin)' })
  @ApiResponse({ status: 200, description: 'Restoran silindi' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.restaurantsService.remove(id);
  }
}
