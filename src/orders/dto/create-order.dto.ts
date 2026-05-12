import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateOrderDto {
  @ApiProperty({ example: 'uuid-of-restaurant' })
  @IsUUID()
  @IsNotEmpty()
  restaurantId: string;

  @ApiProperty({ example: 'Ahmet Yılmaz' })
  @IsString()
  @IsNotEmpty()
  customerName: string;

  @ApiProperty({ example: '05001234567' })
  @IsString()
  @IsNotEmpty()
  customerPhone: string;

  @ApiProperty({ example: 'Bağcılar Mah. No:5 İstanbul' })
  @IsString()
  @IsNotEmpty()
  deliveryAddress: string;

  @ApiPropertyOptional({ example: 41.015137 })
  @IsNumber()
  @IsOptional()
  deliveryLatitude?: number;

  @ApiPropertyOptional({ example: 28.979530 })
  @IsNumber()
  @IsOptional()
  deliveryLongitude?: number;

  @ApiProperty({ example: 150.00, description: 'Sipariş toplam tutarı' })
  @IsNumber()
  @Min(0)
  orderTotal: number;

  @ApiPropertyOptional({ example: 15.00 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  deliveryFee?: number;

  @ApiPropertyOptional({ example: 'Zil çalmasın, kapıya bırakın' })
  @IsString()
  @IsOptional()
  notes?: string;
}
