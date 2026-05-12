import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateCourierStatusDto {
  @ApiProperty({ example: true, description: 'true = online, false = offline' })
  @IsBoolean()
  isOnline: boolean;
}
