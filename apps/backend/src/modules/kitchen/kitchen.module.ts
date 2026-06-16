import { Body, Controller, Get, Module, Param, ParseUUIDPipe, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { KotStatus, Role } from '@prisma/client';
import { IsEnum } from 'class-validator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Tenant } from '../../common/decorators/tenant.decorator';
import { BusinessException } from '../../common/exceptions/business.exception';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { TenantContext } from '../../common/types/auth.types';
import { PrismaService } from '../../prisma/prisma.service';

class KotStatusDto {
  @ApiProperty({ enum: KotStatus })
  @IsEnum(KotStatus)
  status!: KotStatus;
}

@ApiTags('kitchen')
@ApiBearerAuth()
@UseGuards(TenantGuard)
@Controller('kitchen')
class KitchenController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('kots')
  @Roles(Role.OWNER, Role.MANAGER, Role.COOK, Role.WAITER)
  @ApiOperation({ summary: 'Faol KOT‘lar (KDS — oshxona ekrani)' })
  async kots(@Tenant() ctx: TenantContext) {
    return this.prisma.kot.findMany({
      where: {
        status: { in: [KotStatus.NEW, KotStatus.COOKING, KotStatus.READY] },
        sale: { organizationId: ctx.orgId, branchId: ctx.branchId },
      },
      include: { sale: { select: { id: true, tableId: true, table: { select: { name: true } }, staff: { select: { fish: true } } } } },
      orderBy: { sentAt: 'asc' },
    });
  }

  @Patch('kots/:id/status')
  @Roles(Role.OWNER, Role.MANAGER, Role.COOK, Role.WAITER)
  @ApiOperation({ summary: 'Taom holatini o‘zgartirish (NEW→COOKING→READY→SERVED)' })
  async setStatus(@Param('id', ParseUUIDPipe) id: string, @Body() dto: KotStatusDto, @Tenant() ctx: TenantContext) {
    const kot = await this.prisma.kot.findFirst({
      where: { id, sale: { organizationId: ctx.orgId, branchId: ctx.branchId } },
      select: { id: true },
    });
    if (!kot) {
      throw new BusinessException('E2001', 'KOT topilmadi');
    }
    const data: { status: KotStatus; readyAt?: Date; servedAt?: Date } = { status: dto.status };
    if (dto.status === KotStatus.READY) data.readyAt = new Date();
    if (dto.status === KotStatus.SERVED) data.servedAt = new Date();
    return this.prisma.kot.update({ where: { id }, data });
  }
}

@Module({ controllers: [KitchenController] })
export class KitchenModule {}
