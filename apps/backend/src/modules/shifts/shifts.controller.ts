import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Tenant } from '../../common/decorators/tenant.decorator';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { AuthUser, TenantContext } from '../../common/types/auth.types';
import { CloseShiftDto, OpenShiftDto } from './dto/shifts.dto';
import { ShiftsService } from './shifts.service';

@ApiTags('shifts')
@ApiBearerAuth()
@UseGuards(TenantGuard)
@Controller('shifts')
export class ShiftsController {
  constructor(private readonly shifts: ShiftsService) {}

  @Get('current')
  @ApiOperation({ summary: 'Joriy ochiq smena' })
  current(@CurrentUser() user: AuthUser, @Tenant() ctx: TenantContext) {
    return this.shifts.current(user, ctx);
  }

  @Post('open')
  @Roles(Role.CASHIER, Role.SELLER, Role.WAITER, Role.MANAGER, Role.OWNER)
  @ApiOperation({ summary: 'Smena ochish' })
  open(@Body() dto: OpenShiftDto, @CurrentUser() user: AuthUser, @Tenant() ctx: TenantContext) {
    return this.shifts.open(dto, user, ctx);
  }

  @Post('close')
  @Roles(Role.CASHIER, Role.SELLER, Role.WAITER, Role.MANAGER, Role.OWNER)
  @ApiOperation({ summary: 'Smena yopish (Z-hisobot)' })
  close(@Body() dto: CloseShiftDto, @CurrentUser() user: AuthUser, @Tenant() ctx: TenantContext) {
    return this.shifts.close(dto, user, ctx);
  }

  @Get(':id/report')
  @ApiOperation({ summary: 'X/Z hisobot' })
  report(@Param('id', ParseUUIDPipe) id: string, @Tenant() ctx: TenantContext) {
    return this.shifts.report(id, ctx);
  }
}
