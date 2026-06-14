import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { Tenant } from '../../common/decorators/tenant.decorator';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { TenantContext } from '../../common/types/auth.types';
import { AdjustStockDto, SetMinQtyDto, StockQueryDto, WasteStockDto } from './dto/inventory.dto';
import { InventoryService } from './inventory.service';

@ApiTags('inventory')
@ApiBearerAuth()
@UseGuards(TenantGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Get('stock')
  @ApiOperation({ summary: 'Qoldiqlar (filial bo‘yicha)' })
  findStock(@Query() query: StockQueryDto, @Tenant() ctx: TenantContext) {
    return this.inventory.findStock(query, ctx);
  }

  @Get('movements/:productId')
  @ApiOperation({ summary: 'Mahsulot harakatlari tarixi' })
  movements(@Param('productId', ParseUUIDPipe) productId: string, @Tenant() ctx: TenantContext) {
    return this.inventory.listMovements(productId, ctx);
  }

  @Post('adjust')
  @Roles(Role.OWNER, Role.MANAGER, Role.STOCKKEEPER)
  @ApiOperation({ summary: 'Inventarizatsiya (qoldiqni qayta hisoblash)' })
  adjust(@Body() dto: AdjustStockDto, @Tenant() ctx: TenantContext) {
    return this.inventory.adjust(dto, ctx);
  }

  @Post('waste')
  @Roles(Role.OWNER, Role.MANAGER, Role.STOCKKEEPER)
  @ApiOperation({ summary: 'Hisobdan chiqarish (waste)' })
  waste(@Body() dto: WasteStockDto, @Tenant() ctx: TenantContext) {
    return this.inventory.waste(dto, ctx);
  }

  @Post('min-qty')
  @Roles(Role.OWNER, Role.MANAGER, Role.STOCKKEEPER)
  @ApiOperation({ summary: 'Kam qoldiq chegarasini belgilash' })
  setMinQty(@Body() dto: SetMinQtyDto, @Tenant() ctx: TenantContext) {
    return this.inventory.setMinQty(dto, ctx);
  }
}
