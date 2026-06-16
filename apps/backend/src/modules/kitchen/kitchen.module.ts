import { Body, Controller, Get, Module, Param, ParseUUIDPipe, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { KotStatus, Role } from '@prisma/client';
import { IsEnum } from 'class-validator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Tenant } from '../../common/decorators/tenant.decorator';
import { BusinessException } from '../../common/exceptions/business.exception';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RealtimeGateway } from '../../common/realtime/realtime.gateway';
import { AuthUser, TenantContext } from '../../common/types/auth.types';
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
  ) {}

  @Get('kots')
  @Roles(Role.OWNER, Role.MANAGER, Role.COOK, Role.WAITER)
  @ApiOperation({ summary: 'Faol KOT‘lar (KDS — oshxona ekrani)' })
  async kots(@CurrentUser() user: AuthUser, @Tenant() ctx: TenantContext) {
    return this.prisma.kot.findMany({
      where: {
        status: { in: [KotStatus.NEW, KotStatus.COOKING, KotStatus.READY] },
        sale: {
          organizationId: ctx.orgId,
          branchId: ctx.branchId,
          // A waiter only sees their own orders (signal/badge for their tables);
          // the cook/manager/owner see the whole kitchen.
          ...(user.role === Role.WAITER ? { staffId: user.id } : {}),
        },
      },
      include: { sale: { select: { id: true, tableId: true, table: { select: { name: true } }, staff: { select: { fish: true } } } } },
      orderBy: { sentAt: 'asc' },
    });
  }

  @Patch('kots/:id/status')
  @Roles(Role.OWNER, Role.MANAGER, Role.COOK, Role.WAITER)
  @ApiOperation({ summary: 'Taom holatini o‘zgartirish (oshpaz: COOKING/READY; ofitsiant: faqat o‘ziniki SERVED)' })
  async setStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: KotStatusDto,
    @CurrentUser() user: AuthUser,
    @Tenant() ctx: TenantContext,
  ) {
    const kot = await this.prisma.kot.findFirst({
      where: { id, sale: { organizationId: ctx.orgId, branchId: ctx.branchId } },
      select: { id: true, sale: { select: { staffId: true } } },
    });
    if (!kot) {
      throw new BusinessException('E2001', 'KOT topilmadi');
    }
    // Cooking/ready is the cook's job. A waiter may only mark their OWN order
    // as served (delivered to the table).
    if (user.role === Role.WAITER) {
      if (dto.status !== KotStatus.SERVED || kot.sale.staffId !== user.id) {
        throw new BusinessException(
          'E1002',
          'Ofitsiant faqat o‘z buyurtmasini "berildi" deb belgilashi mumkin. Tayyorlashni oshpaz belgilaydi.',
        );
      }
    }
    const data: { status: KotStatus; readyAt?: Date; servedAt?: Date } = { status: dto.status };
    if (dto.status === KotStatus.READY) data.readyAt = new Date();
    if (dto.status === KotStatus.SERVED) data.servedAt = new Date();
    const updated = await this.prisma.kot.update({ where: { id }, data });
    this.realtime.notify(ctx.orgId, ctx.branchId, ['kitchen', 'orders', 'tables']);
    return updated;
  }
}

@Module({ controllers: [KitchenController] })
export class KitchenModule {}
