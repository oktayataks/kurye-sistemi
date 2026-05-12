import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { OrderStatus } from '../order.entity';

export class UpdateOrderStatusDto {
  @ApiProperty({
    enum: OrderStatus,
    example: OrderStatus.ASSIGNED,
    description: 'Yeni sipariş durumu',
  })
  @IsEnum(OrderStatus)
  status: OrderStatus;

  @ApiPropertyOptional({ example: 'uuid-of-courier', description: 'Atanan kurye ID (ASSIGNED durumunda gerekli)' })
  @IsUUID()
  @IsOptional()
  courierId?: string;
}
