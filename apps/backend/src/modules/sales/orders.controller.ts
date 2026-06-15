import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Tenant } from '../../common/decorators/tenant.decorator';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { AuthUser, TenantContext } from '../../common/types/auth.types';
import { AddItemsDto, OpenOrderDto, PayOrderDto } from './dto/order.dto';
import { SalesService } from './sales.service';

const SELL_ROLES = [Role.WAITER, Role.CASHIER, Role.SELLER, Role.MANAGER, Role.OWNER];

@ApiTags('orders')
@ApiBearerAuth()
@UseGuards(TenantGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly sales: SalesService) {}

  @Get('by-table/:tableId')
  @ApiOperation({ summary: 'Stolning ochiq buyurtmasi (yoki null)' })
  byTable(@Param('tableId', ParseUUIDPipe) tableId: string, @Tenant() ctx: TenantContext) {
    return this.sales.getOpenByTable(tableId, ctx);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buyurtma tafsiloti' })
  getOne(@Param('id', ParseUUIDPipe) id: string, @Tenant() ctx: TenantContext) {
    return this.sales.getOrder(id, ctx);
  }

  @Post()
  @Roles(...SELL_ROLES)
  @ApiOperation({ summary: 'Buyurtma ochish (stolga, to‘lovsiz) — oshxonaga KOT' })
  open(@Body() dto: OpenOrderDto, @CurrentUser() user: AuthUser, @Tenant() ctx: TenantContext) {
    return this.sales.openOrder(dto, user, ctx);
  }

  @Post(':id/items')
  @Roles(...SELL_ROLES)
  @ApiOperation({ summary: 'Buyurtmaga taom qo‘shish (yangi KOT)' })
  addItems(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddItemsDto,
    @CurrentUser() user: AuthUser,
    @Tenant() ctx: TenantContext,
  ) {
    return this.sales.addItems(id, dto, user, ctx);
  }

  @Post(':id/pay')
  @Roles(...SELL_ROLES)
  @ApiOperation({ summary: 'Hisobni yopish — to‘lov olish, stol bo‘shaydi' })
  pay(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PayOrderDto,
    @CurrentUser() user: AuthUser,
    @Tenant() ctx: TenantContext,
  ) {
    return this.sales.payOrder(id, dto, user, ctx);
  }

  @Post(':id/cancel')
  @Roles(Role.MANAGER, Role.OWNER)
  @ApiOperation({ summary: 'Buyurtmani bekor qilish (qoldiq qaytadi, stol bo‘shaydi)' })
  cancel(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser, @Tenant() ctx: TenantContext) {
    return this.sales.cancelOrder(id, user, ctx);
  }
}
