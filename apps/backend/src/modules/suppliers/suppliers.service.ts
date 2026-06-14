import { Injectable } from '@nestjs/common';
import { PurchaseStatus, StockMovementType } from '@prisma/client';
import { BusinessException } from '../../common/exceptions/business.exception';
import { Money } from '../../common/money/money';
import { Quantity } from '../../common/money/quantity';
import { TenantContext } from '../../common/types/auth.types';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { StockManager } from '../inventory/stock.manager';
import { CreatePurchaseDto, CreateSupplierDto } from './dto/suppliers.dto';

@Injectable()
export class SuppliersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stock: StockManager,
    private readonly redis: RedisService,
  ) {}

  // ───────────── Suppliers ─────────────
  findSuppliers(ctx: TenantContext) {
    return this.prisma.supplier.findMany({
      where: { organizationId: ctx.orgId, deletedAt: null, active: true },
      orderBy: { name: 'asc' },
    });
  }

  createSupplier(dto: CreateSupplierDto, ctx: TenantContext) {
    return this.prisma.supplier.create({
      data: { organizationId: ctx.orgId, name: dto.name, phone: dto.phone, note: dto.note },
    });
  }

  // ───────────── Purchases ─────────────
  findPurchases(ctx: TenantContext) {
    return this.prisma.purchase.findMany({
      where: { organizationId: ctx.orgId, branchId: ctx.branchId, deletedAt: null },
      include: { supplier: { select: { name: true } }, items: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  /**
   * Create a purchase and immediately receive it: stock increases atomically,
   * product cost is updated to the latest purchase cost. All in one transaction.
   */
  async createAndReceive(dto: CreatePurchaseDto, ctx: TenantContext) {
    // Validate all products belong to the tenant first.
    const productIds = dto.items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, organizationId: ctx.orgId, deletedAt: null },
      select: { id: true },
    });
    if (products.length !== new Set(productIds).size) {
      throw new BusinessException('E4102', 'Ba‘zi mahsulotlar katalogda yo‘q');
    }

    let total = Money.zero();
    for (const item of dto.items) {
      total = total.add(Money.of(item.cost).multiply(item.qty).toString());
    }

    const purchase = await this.prisma.$transaction(async (tx) => {
      const created = await tx.purchase.create({
        data: {
          organizationId: ctx.orgId,
          branchId: ctx.branchId,
          supplierId: dto.supplierId,
          note: dto.note,
          status: PurchaseStatus.RECEIVED,
          total: total.toPrisma(),
          receivedAt: new Date(),
          items: {
            create: dto.items.map((i) => ({
              productId: i.productId,
              qty: Quantity.of(i.qty).toPrisma(),
              cost: Money.of(i.cost).toPrisma(),
            })),
          },
        },
        include: { items: true },
      });

      for (const item of dto.items) {
        await this.stock.increase(
          tx,
          {
            organizationId: ctx.orgId,
            branchId: ctx.branchId,
            productId: item.productId,
            qty: Quantity.of(item.qty),
            refType: 'PURCHASE',
            refId: created.id,
          },
          StockMovementType.IN,
        );
        // Latest cost wins (moving cost can be added later as a strategy).
        await tx.product.update({
          where: { id: item.productId },
          data: { cost: Money.of(item.cost).toPrisma() },
        });
      }

      return created;
    });

    await this.invalidate(ctx);
    return purchase;
  }

  private async invalidate(ctx: TenantContext): Promise<void> {
    await this.redis.delPattern(`catalog:${ctx.orgId}:${ctx.branchId}:*`);
  }
}
