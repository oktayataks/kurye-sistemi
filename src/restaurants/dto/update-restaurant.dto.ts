import { PartialType } from '@nestjs/mapped-types';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { CreateRestaurantDto } from './create-restaurant.dto';

export class UpdateRestaurantDto extends PartialType(CreateRestaurantDto) {
  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  yemeksepetiApiKey?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  getirApiKey?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  trendyolApiKey?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  yemeksepetiEnabled?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  getirEnabled?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  trendyolEnabled?: boolean;
}
