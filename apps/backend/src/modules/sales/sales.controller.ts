import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Tenant } from '../../common/decorators/tenant.decorator';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { AuthUser, TenantContext } from '../../common/types/auth.types';
import { CreateSaleDto } from './dto/create-sale.dto';
import { SalesService } from './sales.service';

@ApiTags('sales')
@ApiBearerAuth()
@UseGuards(TenantGuard)
@Controller('sales')
export class SalesController {
  constructor(private readonly sales: SalesService) {}

  @Post()
  @Roles(Role.CASHIER, Role.WAITER, Role.MANAGER, Role.OWNER)
  @ApiOperation({ summary: 'Savdo yaratish (atomik, idempotent)' })
  create(@Body() dto: CreateSaleDto, @CurrentUser() user: AuthUser, @Tenant() ctx: TenantContext) {
    return this.sales.create(dto, user, ctx);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Savdo tafsiloti (chek)' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @Tenant() ctx: TenantContext) {
    return this.sales.findOne(id, ctx);
  }

  @Post(':id/refund')
  @Roles(Role.MANAGER, Role.OWNER)
  @ApiOperation({ summary: 'Qaytarish (vozvrat) — qoldiq qaytadi' })
  refund(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
    @Tenant() ctx: TenantContext,
  ) {
    return this.sales.refund(id, user, ctx);
  }
}
