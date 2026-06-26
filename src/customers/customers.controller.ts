import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CustomersService } from './customers.service';

@Controller('customers')
@UseGuards(JwtAuthGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  async findAll(@Request() req, @Query('search') search?: string) {
    return this.customersService.findAll(req.user.id, req.user.role, search);
  }

  @Get('phone/:phone')
  async findByPhone(@Param('phone') phone: string, @Request() req) {
    return this.customersService.findByPhone(req.user.id, phone);
  }

  @Post()
  async create(@Body() data: any, @Request() req) {
    return this.customersService.create(req.user.id, data);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() data: any) {
    return this.customersService.update(id, data);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.customersService.remove(id);
  }
}
