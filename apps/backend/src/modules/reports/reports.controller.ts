import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Tenant } from '../../common/decorators/tenant.decorator';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { TenantContext } from '../../common/types/auth.types';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(TenantGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('dashboard')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Dashboard KPI (bugungi savdo, top mahsulot, kam qoldiq)' })
  dashboard(@Tenant() ctx: TenantContext) {
    return this.reports.dashboard(ctx);
  }

  @Get('sales')
  @Roles(Role.OWNER, Role.MANAGER, Role.CASHIER, Role.SELLER, Role.WAITER)
  @ApiOperation({ summary: 'Savdo tarixi (cursor)' })
  sales(@Query() query: PaginationDto, @Tenant() ctx: TenantContext) {
    return this.reports.sales(query, ctx);
  }

  @Get('profit')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Foyda hisoboti (sana oraliq)' })
  profit(@Query('from') from: string, @Query('to') to: string, @Tenant() ctx: TenantContext) {
    return this.reports.profit(from, to, ctx);
  }

  @Get('staff')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Hodimlar bo‘yicha savdo hisoboti' })
  staffSales(@Query('from') from: string, @Query('to') to: string, @Tenant() ctx: TenantContext) {
    return this.reports.staffSales(from, to, ctx);
  }
}
