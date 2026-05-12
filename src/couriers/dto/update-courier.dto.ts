import { IsBoolean, IsEnum, IsNumber, IsOptional } from 'class-validator';
import { VehicleType } from '../courier.entity';

export class UpdateCourierDto {
  @IsEnum(VehicleType)
  @IsOptional()
  vehicleType?: VehicleType;

  @IsNumber()
  @IsOptional()
  latitude?: number;

  @IsNumber()
  @IsOptional()
  longitude?: number;

  @IsBoolean()
  @IsOptional()
  isOnline?: boolean;
}
