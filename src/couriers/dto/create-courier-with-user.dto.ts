import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { VehicleType } from '../courier.entity';

/**
 * Tek adımda hem User (rol: courier) hem de Courier kaydı oluşturur.
 * Admin panelinde "Yeni Kurye Ekle" akışı için kullanılır.
 */
export class CreateCourierWithUserDto {
  @ApiProperty({ example: 'kurye@firma.com' })
  @IsEmail({}, { message: 'Geçerli bir e-posta giriniz' })
  email: string;

  @ApiProperty({ example: 'Ahmet Kara' })
  @IsString()
  @IsNotEmpty({ message: 'Ad soyad zorunludur' })
  fullName: string;

  @ApiProperty({ example: 'demo123' })
  @IsString()
  @MinLength(6, { message: 'Şifre en az 6 karakter olmalıdır' })
  password: string;

  @ApiPropertyOptional({ example: '05551112233' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ enum: VehicleType, example: VehicleType.MOTORBIKE })
  @IsEnum(VehicleType)
  @IsOptional()
  vehicleType?: VehicleType;

  @ApiPropertyOptional({ example: 41.015137 })
  @IsNumber()
  @IsOptional()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({ example: 28.97953 })
  @IsNumber()
  @IsOptional()
  @Min(-180)
  @Max(180)
  longitude?: number;
}
