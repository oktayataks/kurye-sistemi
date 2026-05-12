import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateRestaurantDto {
  @ApiProperty({ example: 'Merkez Restoran' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Atatürk Cad. No:1, İstanbul' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiPropertyOptional({ example: 41.015137 })
  @IsNumber()
  @IsOptional()
  latitude?: number;

  @ApiPropertyOptional({ example: 28.979530 })
  @IsNumber()
  @IsOptional()
  longitude?: number;

  @ApiPropertyOptional({ example: '05001234567' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ example: 'uuid-of-user' })
  @IsUUID()
  @IsNotEmpty()
  userId: string;
}
