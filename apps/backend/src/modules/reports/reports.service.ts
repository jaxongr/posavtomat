import { Injectable } from '@nestjs/common';
import { SaleStatus } from '@prisma/client';
import { buildPage, PaginationDto } from '../../common/dto/pagination.dto';
import { Money } from '../../common/money/money';
import { TenantContext } from '../../common/types/auth.types';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Dashboard KPIs for the current branch (today). */
  async dashboard(ctx: TenantContext) {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const base = {
      organizationId: ctx.orgId,
      branchId: ctx.branchId,
      status: SaleStatus.COMPLETED,
      createdAt: { gte: startOfDay },
    };

    const [agg, count, lowStock, sales] = await Promise.all([
      this.prisma.sale.aggregate({ where: base, _sum: { total: true } }),
      this.prisma.sale.count({ where: base }),
      this.prisma.stock.count({
        where: {
          organizationId: ctx.orgId,
          branchId: ctx.branchId,
          quantity: { lte: this.prisma.stock.fields.minQuantity },
        },
      }),
      this.prisma.sale.findMany({
        where: base,
        select: { id: true, total: true, createdAt: true, items: { select: { productId: true, qty: true, price: true } } },
      }),
    ]);

    // Top products by revenue (today).
    const revenueByProduct = new Map<string, Money>();
    for (const sale of sales) {
      for (const item of sale.items) {
        const line = Money.of(item.price).multiply(item.qty.toString());
        const prev = revenueByProduct.get(item.productId) ?? Money.zero();
        revenueByProduct.set(item.productId, prev.add(line.toString()));
      }
    }
    const topIds = [...revenueByProduct.entries()]
      .sort((a, b) => Number(b[1].toString()) - Number(a[1].toString()))
      .slice(0, 5);
    const products = await this.prisma.product.findMany({
      where: { id: { in: topIds.map(([id]) => id) } },
      select: { id: true, name: true },
    });
    const nameById = new Map(products.map((p) => [p.id, p.name]));
    const topProducts = topIds.map(([id, revenue]) => ({
      productId: id,
      name: nameById.get(id) ?? '—',
      revenue: revenue.toString(),
    }));

    return {
      todaySalesTotal: Money.of(agg._sum.total ?? 0).toString(),
      todaySalesCount: count,
      lowStockCount: lowStock,
      topProducts,
    };
  }

  /** Sales history (cursor-paginated). */
  async sales(query: PaginationDto, ctx: TenantContext) {
    const rows = await this.prisma.sale.findMany({
      where: { organizationId: ctx.orgId, branchId: ctx.branchId },
      select: {
        id: true,
        type: true,
        status: true,
        total: true,
        discount: true,
        subtotal: true,
        paidStatus: true,
        createdAt: true,
        staff: { select: { fish: true } },
      },
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
    });
    return buildPage(rows, query.limit);
  }
}
