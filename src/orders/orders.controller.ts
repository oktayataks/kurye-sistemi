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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { AssignmentService } from './services/assignment.service';
import { MockOrdersService } from './mock-orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrderFilterDto } from './dto/order-filter.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole, User } from '../users/user.entity';

@ApiTags('Siparişler')
@ApiBearerAuth('JWT')
@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly assignmentService: AssignmentService,
    private readonly mockOrdersService: MockOrdersService,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.RESTAURANT)
  @ApiOperation({ summary: 'Yeni sipariş oluştur (Admin veya Restoran)' })
  @ApiResponse({ status: 201, description: 'Sipariş oluşturuldu' })
  create(@Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.create(createOrderDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Siparişleri listele (Admin: tümü, Restaurant: kendi siparişleri, Courier: kendine atananlar)',
  })
  @ApiResponse({ status: 200, description: 'Sipariş listesi' })
  findAll(@Query() filters: OrderFilterDto, @CurrentUser() user: User) {
    return this.ordersService.findAll(
      { page: filters.page, limit: filters.limit },
      user,
      filters.restaurantId,
      filters.courierId,
    );
  }

  @Get('available')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Bekleyen siparişleri listele (kuryeler için)' })
  @ApiResponse({ status: 200, description: 'Bekleyen sipariş listesi' })
  async getAvailableOrders() {
    return this.ordersService.getAvailableOrders();
  }

  @Get('my-orders')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Kuryenin kendi siparişlerini listele' })
  @ApiResponse({ status: 200, description: 'Kurye sipariş listesi' })
  async getMyCourierOrders(@Request() req) {
    return this.ordersService.getMyCourierOrders(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Sipariş detayı getir' })
  @ApiResponse({ status: 200, description: 'Sipariş bulundu' })
  @ApiResponse({ status: 404, description: 'Sipariş bulunamadı' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.findOne(id);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN, UserRole.RESTAURANT, UserRole.COURIER)
  @ApiOperation({ summary: 'Sipariş durumunu güncelle' })
  @ApiResponse({ status: 200, description: 'Sipariş durumu güncellendi' })
  @ApiResponse({ status: 400, description: 'Geçersiz durum geçişi' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateStatusDto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(id, updateStatusDto);
  }

  @Post('mock/generate')
  @ApiOperation({ summary: 'Mock sipariş oluştur (test amaçlı)' })
  @ApiResponse({ status: 201, description: 'Mock sipariş oluşturuldu' })
  async generateMockOrder() {
    return this.mockOrdersService.generateSingleOrder();
  }

  @Post(':id/assign')
  @Roles(UserRole.ADMIN, UserRole.RESTAURANT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Siparişe otomatik kurye ata',
    description:
      'Haversine mesafe, aktif sipariş yükü ve rating skorlarına göre en uygun çevrimiçi kuryeyi bulur ve atar.',
  })
  @ApiResponse({ status: 200, description: 'Kurye başarıyla atandı' })
  @ApiResponse({ status: 400, description: 'Online kurye yok veya sipariş pending değil' })
  @ApiResponse({ status: 404, description: 'Sipariş veya restoran bulunamadı' })
  assignCourier(@Param('id', ParseUUIDPipe) id: string) {
    return this.assignmentService.findBestCourier(id);
  }

  @Post(':id/accept')
  @UseGuards(JwtAuthGuard)
  async acceptOrder(
    @Param('id') id: string,
    @Request() req,
  ) {
    return this.ordersService.acceptOrder(id, req.user.id);
  }

  @Get('offered/me')
  @Roles(UserRole.COURIER)
  @ApiOperation({ summary: 'Kuryeye teklif edilen aktif siparişi getir' })
  @ApiResponse({ status: 200, description: 'Teklif edilen sipariş' })
  async getOfferedOrder(@Request() req) {
    return this.ordersService.getOfferedOrderForCourier(req.user.id);
  }

  @Post(':id/accept-offer')
  @Roles(UserRole.COURIER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Teklif edilen siparişi kabul et' })
  @ApiResponse({ status: 200, description: 'Sipariş kabul edildi' })
  async acceptOffer(@Param('id') id: string, @Request() req) {
    return this.ordersService.acceptOfferByUserId(id, req.user.id);
  }

  @Post(':id/reject-offer')
  @Roles(UserRole.COURIER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Teklif edilen siparişi reddet' })
  @ApiResponse({ status: 200, description: 'Sipariş reddedildi, bir sonraki kuryeye teklif edildi' })
  async rejectOffer(@Param('id') id: string, @Request() req) {
    return this.ordersService.rejectOfferByUserId(id, req.user.id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.RESTAURANT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sipariş sil (sadece pending durumunda)' })
  @ApiResponse({ status: 200, description: 'Sipariş silindi' })
  @ApiResponse({ status: 403, description: 'Sadece pending siparişler silinebilir' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.remove(id);
  }
}
