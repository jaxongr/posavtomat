import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { Tenant } from '../../common/decorators/tenant.decorator';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { TenantContext } from '../../common/types/auth.types';
import { CreateStaffDto, UpdateStaffDto } from './dto/staff.dto';
import { StaffService } from './staff.service';

@ApiTags('staff')
@ApiBearerAuth()
@UseGuards(TenantGuard)
@Roles(Role.OWNER, Role.MANAGER)
@Controller('staff')
export class StaffController {
  constructor(private readonly staff: StaffService) {}

  @Get()
  @ApiOperation({ summary: 'Hodimlar ro‘yxati' })
  findAll(@Tenant() ctx: TenantContext) {
    return this.staff.findAll(ctx);
  }

  @Post()
  @ApiOperation({ summary: 'Hodim qo‘shish (rol + PIN/parol)' })
  create(@Body() dto: CreateStaffDto, @Tenant() ctx: TenantContext) {
    return this.staff.create(dto, ctx);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateStaffDto, @Tenant() ctx: TenantContext) {
    return this.staff.update(id, dto, ctx);
  }

  @Delete(':id')
  deactivate(@Param('id', ParseUUIDPipe) id: string, @Tenant() ctx: TenantContext) {
    return this.staff.deactivate(id, ctx);
  }
}
