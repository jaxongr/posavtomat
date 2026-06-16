import { Body, Controller, Delete, Get, Module, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { Role, TableStatus } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Tenant } from '../../common/decorators/tenant.decorator';
import { BusinessException } from '../../common/exceptions/business.exception';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RealtimeGateway } from '../../common/realtime/realtime.gateway';
import { TenantContext } from '../../common/types/auth.types';
import { PrismaService } from '../../prisma/prisma.service';

class CreateTableDto {
  @ApiProperty({ example: 'Stol 5' })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiPropertyOptional({ example: 'Zal' })
  @IsOptional()
  @IsString()
  zone?: string;

  @ApiPropertyOptional({ example: 4 })
  @IsOptional()
  @IsInt()
  @Min(1)
  seats?: number;
}

class SetStatusDto {
  @ApiProperty({ enum: TableStatus })
  @IsEnum(TableStatus)
  status!: TableStatus;
}

@ApiTags('tables')
@ApiBearerAuth()
@UseGuards(TenantGuard)
@Controller('tables')
class TablesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Zal/stollar (holat bilan)' })
  findAll(@Tenant() ctx: TenantContext) {
    return this.prisma.diningTable.findMany({
      where: { organizationId: ctx.orgId, branchId: ctx.branchId, deletedAt: null, active: true },
      orderBy: [{ zone: 'asc' }, { name: 'asc' }],
    });
  }

  @Post()
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Stol qo‘shish' })
  create(@Body() dto: CreateTableDto, @Tenant() ctx: TenantContext) {
    return this.prisma.diningTable.create({
      data: {
        organizationId: ctx.orgId,
        branchId: ctx.branchId,
        name: dto.name,
        zone: dto.zone,
        seats: dto.seats ?? 4,
      },
    });
  }

  @Patch(':id/status')
  @Roles(Role.OWNER, Role.MANAGER, Role.WAITER, Role.CASHIER)
  @ApiOperation({ summary: 'Stol holatini o‘zgartirish (band/bo‘sh)' })
  async setStatus(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SetStatusDto, @Tenant() ctx: TenantContext) {
    await this.assert(id, ctx);
    const updated = await this.prisma.diningTable.update({ where: { id }, data: { status: dto.status } });
    this.realtime.notify(ctx.orgId, ctx.branchId, ['tables']);
    return updated;
  }

  @Delete(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  async remove(@Param('id', ParseUUIDPipe) id: string, @Tenant() ctx: TenantContext) {
    await this.assert(id, ctx);
    await this.prisma.diningTable.update({ where: { id }, data: { deletedAt: new Date(), active: false } });
    return { id };
  }

  private async assert(id: string, ctx: TenantContext): Promise<void> {
    const found = await this.prisma.diningTable.findFirst({
      where: { id, organizationId: ctx.orgId, branchId: ctx.branchId, deletedAt: null },
      select: { id: true },
    });
    if (!found) {
      throw new BusinessException('E2001', 'Stol topilmadi');
    }
  }
}

@Module({ controllers: [TablesController] })
export class TablesModule {}
