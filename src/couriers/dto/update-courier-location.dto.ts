import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Max, Min } from 'class-validator';

export class UpdateCourierLocationDto {
  @ApiProperty({ example: 41.015137, description: 'Enlem (-90 ile 90 arası)' })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({ example: 28.979530, description: 'Boylam (-180 ile 180 arası)' })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;
}
