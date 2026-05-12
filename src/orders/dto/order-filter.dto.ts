import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class OrderFilterDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Restoran filtrelemesi (Admin için)' })
  @IsOptional()
  @IsUUID()
  restaurantId?: string;

  @ApiPropertyOptional({ description: 'Kurye filtrelemesi (Admin için)' })
  @IsOptional()
  @IsUUID()
  courierId?: string;
}
