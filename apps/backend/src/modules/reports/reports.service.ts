import { Injectable } from '@nestjs/common';
import { Role, SaleStatus } from '@prisma/client';
import { buildPage, PaginationDto } from '../../common/dto/pagination.dto';
import { Money } from '../../common/money/money';
import { AuthUser, TenantContext } from '../../common/types/auth.types';
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

  /** Profit report over a date range: revenue, cost, profit + top by profit. */
  async profit(fromIso: string | undefined, toIso: string | undefined, ctx: TenantContext) {
    const to = toIso ? new Date(toIso) : new Date();
    const from = fromIso ? new Date(fromIso) : new Date(to.getTime() - 30 * 24 * 3600 * 1000);

    const items = await this.prisma.saleItem.findMany({
      where: {
        sale: {
          organizationId: ctx.orgId,
          branchId: ctx.branchId,
          status: SaleStatus.COMPLETED,
          completedAt: { gte: from, lte: to },
        },
      },
      select: { productId: true, qty: true, price: true, cost: true, product: { select: { name: true } } },
    });

    let revenue = Money.zero();
    let cost = Money.zero();
    const byProduct = new Map<string, { name: string; revenue: Money; profit: Money; qty: number }>();

    for (const it of items) {
      const lineRev = Money.of(it.price).multiply(it.qty.toString());
      const lineCost = Money.of(it.cost).multiply(it.qty.toString());
      const lineProfit = lineRev.subtract(lineCost.toString());
      revenue = revenue.add(lineRev.toString());
      cost = cost.add(lineCost.toString());
      const prev = byProduct.get(it.productId) ?? { name: it.product.name, revenue: Money.zero(), profit: Money.zero(), qty: 0 };
      byProduct.set(it.productId, {
        name: it.product.name,
        revenue: prev.revenue.add(lineRev.toString()),
        profit: prev.profit.add(lineProfit.toString()),
        qty: prev.qty + Number(it.qty),
      });
    }

    const topByProfit = [...byProduct.entries()]
      .map(([productId, v]) => ({ productId, name: v.name, qty: v.qty, revenue: v.revenue.toString(), profit: v.profit.toString() }))
      .sort((a, b) => Number(b.profit) - Number(a.profit))
      .slice(0, 20);

    return {
      from: from.toISOString(),
      to: to.toISOString(),
      revenue: revenue.toString(),
      cost: cost.toString(),
      profit: revenue.subtract(cost.toString()).toString(),
      topByProfit,
    };
  }

  /** Per-staff sales performance over a date range. */
  async staffSales(fromIso: string | undefined, toIso: string | undefined, ctx: TenantContext) {
    const to = toIso ? new Date(toIso) : new Date();
    const from = fromIso ? new Date(fromIso) : new Date(to.getTime() - 30 * 24 * 3600 * 1000);

    const grouped = await this.prisma.sale.groupBy({
      by: ['staffId'],
      where: {
        organizationId: ctx.orgId,
        branchId: ctx.branchId,
        status: SaleStatus.COMPLETED,
        completedAt: { gte: from, lte: to },
      },
      _sum: { total: true },
      _count: { _all: true },
    });
    const staff = await this.prisma.staff.findMany({
      where: { id: { in: grouped.map((g) => g.staffId) } },
      select: { id: true, fish: true, role: true },
    });
    const byId = new Map(staff.map((s) => [s.id, s]));
    return grouped
      .map((g) => ({
        staffId: g.staffId,
        fish: byId.get(g.staffId)?.fish ?? '—',
        role: byId.get(g.staffId)?.role ?? null,
        salesCount: g._count._all,
        total: Money.of(g._sum.total ?? 0).toString(),
      }))
      .sort((a, b) => Number(b.total) - Number(a.total));
  }

  /**
   * Sales history (cursor-paginated). Cashiers/sellers/waiters see only their
   * own sales; owners/managers see the whole branch.
   */
  async sales(query: PaginationDto, ctx: TenantContext, user: AuthUser) {
    const ownOnly = user.role === Role.CASHIER || user.role === Role.SELLER || user.role === Role.WAITER || user.role === Role.COOK;
    const rows = await this.prisma.sale.findMany({
      where: {
        organizationId: ctx.orgId,
        branchId: ctx.branchId,
        ...(ownOnly ? { staffId: user.id } : {}),
      },
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
