import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { Tenant } from '../../common/decorators/tenant.decorator';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { TenantContext } from '../../common/types/auth.types';
import { CreatePurchaseDto, CreateSupplierDto } from './dto/suppliers.dto';
import { SuppliersService } from './suppliers.service';

@ApiTags('suppliers')
@ApiBearerAuth()
@UseGuards(TenantGuard)
@Controller()
export class SuppliersController {
  constructor(private readonly suppliers: SuppliersService) {}

  @Get('suppliers')
  findSuppliers(@Tenant() ctx: TenantContext) {
    return this.suppliers.findSuppliers(ctx);
  }

  @Post('suppliers')
  @Roles(Role.OWNER, Role.MANAGER, Role.STOCKKEEPER)
  createSupplier(@Body() dto: CreateSupplierDto, @Tenant() ctx: TenantContext) {
    return this.suppliers.createSupplier(dto, ctx);
  }

  @Get('purchases')
  findPurchases(@Tenant() ctx: TenantContext) {
    return this.suppliers.findPurchases(ctx);
  }

  @Post('purchases')
  @Roles(Role.OWNER, Role.MANAGER, Role.STOCKKEEPER)
  @ApiOperation({ summary: 'Kirim (xarid) — qoldiq atomik oshadi' })
  createPurchase(@Body() dto: CreatePurchaseDto, @Tenant() ctx: TenantContext) {
    return this.suppliers.createAndReceive(dto, ctx);
  }
}
