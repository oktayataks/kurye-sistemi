import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsBooleanString } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class CourierFilterDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Çevrimiçi durumuna göre filtrele',
    enum: ['true', 'false'],
  })
  @IsOptional()
  @IsBooleanString()
  isOnline?: string;
}
