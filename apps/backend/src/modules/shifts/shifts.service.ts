import { Injectable } from '@nestjs/common';
import { Prisma, ShiftStatus } from '@prisma/client';
import { BusinessException } from '../../common/exceptions/business.exception';
import { Money } from '../../common/money/money';
import { AuthUser, TenantContext } from '../../common/types/auth.types';
import { PrismaService } from '../../prisma/prisma.service';
import { CloseShiftDto, OpenShiftDto } from './dto/shifts.dto';

@Injectable()
export class ShiftsService {
  constructor(private readonly prisma: PrismaService) {}

  /** The open shift for the current staff/branch, or null. */
  async current(user: AuthUser, ctx: TenantContext) {
    return this.prisma.shift.findFirst({
      where: {
        organizationId: ctx.orgId,
        branchId: ctx.branchId,
        staffId: user.id,
        status: ShiftStatus.OPEN,
      },
    });
  }

  /** Returns the open shift or throws E4301. Used by the sale engine. */
  async requireOpen(
    tx: Prisma.TransactionClient,
    staffId: string,
    ctx: TenantContext,
  ): Promise<{ id: string }> {
    const shift = await tx.shift.findFirst({
      where: {
        organizationId: ctx.orgId,
        branchId: ctx.branchId,
        staffId,
        status: ShiftStatus.OPEN,
      },
      select: { id: true },
    });
    if (!shift) {
      throw new BusinessException('E4301', 'Smena ochilmagan');
    }
    return shift;
  }

  async open(dto: OpenShiftDto, user: AuthUser, ctx: TenantContext) {
    const existing = await this.current(user, ctx);
    if (existing) {
      throw new BusinessException('E2002', 'Sizda ochiq smena allaqachon bor');
    }
    return this.prisma.shift.create({
      data: {
        organizationId: ctx.orgId,
        branchId: ctx.branchId,
        registerId: dto.registerId,
        staffId: user.id,
        openCash: Money.of(dto.openCash).toPrisma(),
        status: ShiftStatus.OPEN,
      },
    });
  }

  /** Close shift and compute Z-report cash difference. */
  async close(dto: CloseShiftDto, user: AuthUser, ctx: TenantContext) {
    const shift = await this.current(user, ctx);
    if (!shift) {
      throw new BusinessException('E4302', 'Ochiq smena topilmadi');
    }
    // expected cash = openCash + cashSales; diff = countedCloseCash - expected
    const expected = Money.of(shift.openCash).add(shift.cashSales);
    const diff = Money.of(dto.closeCash).subtract(expected.toString());

    return this.prisma.shift.update({
      where: { id: shift.id },
      data: {
        status: ShiftStatus.CLOSED,
        closeCash: Money.of(dto.closeCash).toPrisma(),
        cashDiff: diff.toPrisma(),
        closedAt: new Date(),
      },
    });
  }

  /** X-report (current snapshot) or Z-report (closed shift) figures. */
  async report(shiftId: string, ctx: TenantContext) {
    const shift = await this.prisma.shift.findFirst({
      where: { id: shiftId, organizationId: ctx.orgId, branchId: ctx.branchId },
    });
    if (!shift) {
      throw new BusinessException('E2001', 'Smena topilmadi');
    }
    const salesCount = await this.prisma.sale.count({
      where: { shiftId, status: 'COMPLETED' },
    });
    return {
      shift,
      salesCount,
      expectedCash: Money.of(shift.openCash).add(shift.cashSales).toString(),
    };
  }
}
