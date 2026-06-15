import { Injectable, Logger } from '@nestjs/common';
import {
  PaidStatus,
  PaymentProvider,
  PaymentStatus,
  Prisma,
  ProductType,
  SaleStatus,
  SaleType,
} from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { BusinessException } from '../../common/exceptions/business.exception';
import { Money } from '../../common/money/money';
import { Quantity } from '../../common/money/quantity';
import { AuthUser, TenantContext } from '../../common/types/auth.types';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { StockManager } from '../inventory/stock.manager';
import { ShiftsService } from '../shifts/shifts.service';
import { CreateSaleDto, SaleItemInputDto } from './dto/create-sale.dto';
import { AddItemsDto, OpenOrderDto, PayOrderDto } from './dto/order.dto';

interface PricedLine {
  input: SaleItemInputDto;
  productId: string;
  productName: string;
  productType: ProductType;
  trackStock: boolean;
  unitPrice: Money;
  unitCost: Money;
  qty: Quantity;
  lineTotal: Money;
  modifiers: { id: string; name: string; priceDelta: string }[];
  recipe: { ingredientId: string; qty: Quantity }[];
}

@Injectable()
export class SalesService {
  private readonly logger = new Logger(SalesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stock: StockManager,
    private readonly shifts: ShiftsService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Create a sale atomically: receipt + stock deduction + payment + shift totals,
   * all in one DB transaction. Idempotent on idempotencyKey. Insufficient stock
   * rolls the whole sale back (E4101).
   */
  async create(dto: CreateSaleDto, user: AuthUser, ctx: TenantContext) {
    // 1. Idempotency — return the existing sale if this key was already used.
    const existing = await this.prisma.sale.findUnique({
      where: { organizationId_idempotencyKey: { organizationId: ctx.orgId, idempotencyKey: dto.idempotencyKey } },
      include: { items: true, payments: true },
    });
    if (existing) {
      return existing;
    }

    // 2. Price every line (loads products, variants, modifiers, recipes).
    const lines = await this.priceLines(dto.items, ctx);
    let subtotal = Money.zero();
    for (const line of lines) {
      subtotal = subtotal.add(line.lineTotal.toString());
    }

    // 3. Resolve discount (optional promo code).
    const discount = await this.resolveDiscount(dto.promoCode, subtotal, ctx);
    const total = subtotal.subtract(discount.toString());

    // 4. Payments must cover the total exactly.
    let paid = Money.zero();
    for (const p of dto.payments) {
      paid = paid.add(p.amount);
    }
    if (!paid.equals(total.toString())) {
      throw new BusinessException('E4001', 'To‘lov summasi jami summaga teng emas', {
        total: total.toString(),
        paid: paid.toString(),
      });
    }

    const cashTotal = dto.payments
      .filter((p) => p.provider === PaymentProvider.CASH)
      .reduce((acc, p) => acc.add(p.amount), Money.zero());
    const cardTotal = total.subtract(cashTotal.toString());

    // 5. Atomic transaction.
    try {
      const sale = await this.prisma.$transaction(async (tx) => {
        const shift = await this.shifts.requireOpen(tx, user.id, ctx);

        const created = await tx.sale.create({
          data: {
            organizationId: ctx.orgId,
            branchId: ctx.branchId,
            registerId: undefined,
            shiftId: shift.id,
            staffId: user.id,
            customerId: dto.customerId,
            tableId: dto.tableId,
            type: dto.type,
            status: SaleStatus.COMPLETED,
            paidStatus: PaidStatus.PAID,
            subtotal: subtotal.toPrisma(),
            discount: discount.toPrisma(),
            total: total.toPrisma(),
            idempotencyKey: dto.idempotencyKey,
            completedAt: new Date(),
            items: {
              create: lines.map((l) => ({
                productId: l.productId,
                variantId: l.input.variantId,
                qty: l.qty.toPrisma(),
                price: l.unitPrice.toPrisma(),
                cost: l.unitCost.toPrisma(),
                modifiers: l.modifiers as unknown as Prisma.InputJsonValue,
              })),
            },
            payments: {
              create: dto.payments.map((p) => ({
                provider: p.provider,
                amount: Money.of(p.amount).toPrisma(),
                status: PaymentStatus.SUCCESS,
                idempotencyKey: `${dto.idempotencyKey}:${p.provider}:${randomUUID()}`,
              })),
            },
          },
          include: { items: true, payments: true },
        });

        // Stock deduction (recipe depletion for dishes).
        for (const line of lines) {
          await this.deductForLine(tx, line, ctx, created.id);
        }

        // Restaurant: send order to the kitchen (KOT) and occupy the table.
        if (dto.type === SaleType.DINE_IN || dto.type === SaleType.TAKEAWAY) {
          await tx.kot.create({
            data: {
              saleId: created.id,
              items: lines.map((l) => ({
                productId: l.productId,
                name: l.productName,
                qty: l.qty.toNumber(),
                modifiers: l.modifiers,
              })) as unknown as Prisma.InputJsonValue,
            },
          });
          if (dto.tableId) {
            await tx.diningTable.updateMany({
              where: { id: dto.tableId, organizationId: ctx.orgId, branchId: ctx.branchId },
              data: { status: 'OCCUPIED' },
            });
          }
        }

        // Shift running totals.
        await tx.shift.update({
          where: { id: shift.id },
          data: {
            totalSales: { increment: total.toPrisma() },
            cashSales: { increment: cashTotal.toPrisma() },
            cardSales: { increment: cardTotal.toPrisma() },
          },
        });

        // Loyalty accrual: 1 point per 1000 UZS (no-op if customer not in org).
        if (dto.customerId) {
          const points = Math.floor(total.toNumber() / 1000);
          if (points > 0) {
            await tx.customer.updateMany({
              where: { id: dto.customerId, organizationId: ctx.orgId },
              data: { loyaltyPoints: { increment: points } },
            });
          }
        }

        // Audit.
        await tx.auditLog.create({
          data: {
            staffId: user.id,
            action: 'SALE_CREATE',
            entity: 'Sale',
            entityId: created.id,
            newValue: { total: total.toString(), items: lines.length } as Prisma.InputJsonValue,
          },
        });

        return created;
      });

      await this.redis.delPattern(`catalog:${ctx.orgId}:${ctx.branchId}:*`);
      this.logger.log(`Sale completed: ${sale.id} total=${total.toString()} branch=${ctx.branchId}`);
      return sale;
    } catch (err) {
      // Concurrent request with the same idempotency key — return the winner.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const winner = await this.prisma.sale.findUnique({
          where: {
            organizationId_idempotencyKey: {
              organizationId: ctx.orgId,
              idempotencyKey: dto.idempotencyKey,
            },
          },
          include: { items: true, payments: true },
        });
        if (winner) {
          return winner;
        }
      }
      throw err;
    }
  }

  async findOne(id: string, ctx: TenantContext) {
    const sale = await this.prisma.sale.findFirst({
      where: { id, organizationId: ctx.orgId, branchId: ctx.branchId },
      include: { items: true, payments: true },
    });
    if (!sale) {
      throw new BusinessException('E2001', 'Savdo topilmadi');
    }
    return sale;
  }

  /** Full refund: restore stock, mark sale REFUNDED, audit. Idempotent on status. */
  async refund(id: string, user: AuthUser, ctx: TenantContext) {
    const sale = await this.prisma.sale.findFirst({
      where: { id, organizationId: ctx.orgId, branchId: ctx.branchId },
      include: {
        items: { include: { product: { select: { type: true, trackStock: true } } } },
      },
    });
    if (!sale) {
      throw new BusinessException('E2001', 'Savdo topilmadi');
    }
    if (sale.status === SaleStatus.REFUNDED) {
      return sale; // already refunded — idempotent
    }
    if (sale.status !== SaleStatus.COMPLETED) {
      throw new BusinessException('E2003', 'Faqat yakunlangan savdoni qaytarish mumkin');
    }

    await this.prisma.$transaction(async (tx) => {
      for (const item of sale.items) {
        if (item.product.type === ProductType.DISH) {
          // Restore dish ingredients via recipe.
          const recipe = await tx.recipe.findUnique({
            where: { dishProductId: item.productId },
            include: { items: true },
          });
          for (const ri of recipe?.items ?? []) {
            await this.stock.increase(
              tx,
              {
                organizationId: ctx.orgId,
                branchId: ctx.branchId,
                productId: ri.ingredientId,
                qty: Quantity.of(ri.qty).multiply(item.qty.toString()),
                refType: 'RETURN',
                refId: sale.id,
              },
              'RETURN',
            );
          }
        } else if (item.product.trackStock) {
          await this.stock.increase(
            tx,
            {
              organizationId: ctx.orgId,
              branchId: ctx.branchId,
              productId: item.productId,
              qty: Quantity.of(item.qty),
              refType: 'RETURN',
              refId: sale.id,
            },
            'RETURN',
          );
        }
      }

      await tx.sale.update({
        where: { id: sale.id },
        data: { status: SaleStatus.REFUNDED, paidStatus: PaidStatus.REFUNDED },
      });

      await tx.auditLog.create({
        data: {
          staffId: user.id,
          action: 'SALE_REFUND',
          entity: 'Sale',
          entityId: sale.id,
          oldValue: { status: sale.status } as Prisma.InputJsonValue,
          newValue: { status: SaleStatus.REFUNDED } as Prisma.InputJsonValue,
        },
      });
    });

    await this.redis.delPattern(`catalog:${ctx.orgId}:${ctx.branchId}:*`);
    return this.findOne(id, ctx);
  }

  // ═══════════════ RESTAURANT ORDER LIFECYCLE (pay-later) ═══════════════

  /** Open order for a table with items. Status OPEN, not paid. Sends a KOT. */
  async openOrder(dto: OpenOrderDto, user: AuthUser, ctx: TenantContext) {
    const existing = await this.prisma.sale.findFirst({
      where: { tableId: dto.tableId, organizationId: ctx.orgId, branchId: ctx.branchId, status: SaleStatus.OPEN },
      select: { id: true },
    });
    if (existing) {
      // Table already has an open order — append instead of opening a new one.
      return this.addItems(existing.id, { items: dto.items }, user, ctx);
    }

    const lines = await this.priceLines(dto.items, ctx);
    let subtotal = Money.zero();
    for (const l of lines) subtotal = subtotal.add(l.lineTotal.toString());
    const discount = await this.resolveDiscount(dto.promoCode, subtotal, ctx);
    const total = subtotal.subtract(discount.toString());

    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.sale.create({
        data: {
          organizationId: ctx.orgId,
          branchId: ctx.branchId,
          staffId: user.id,
          tableId: dto.tableId,
          type: SaleType.DINE_IN,
          status: SaleStatus.OPEN,
          paidStatus: PaidStatus.UNPAID,
          subtotal: subtotal.toPrisma(),
          discount: discount.toPrisma(),
          total: total.toPrisma(),
          items: {
            create: lines.map((l) => ({
              productId: l.productId,
              variantId: l.input.variantId,
              qty: l.qty.toPrisma(),
              price: l.unitPrice.toPrisma(),
              cost: l.unitCost.toPrisma(),
              modifiers: l.modifiers as unknown as Prisma.InputJsonValue,
            })),
          },
        },
      });
      for (const line of lines) await this.deductForLine(tx, line, ctx, created.id);
      await this.createKot(tx, created.id, lines);
      await tx.diningTable.updateMany({
        where: { id: dto.tableId, organizationId: ctx.orgId, branchId: ctx.branchId },
        data: { status: 'OCCUPIED' },
      });
      return created;
    });
    await this.redis.delPattern(`catalog:${ctx.orgId}:${ctx.branchId}:*`);
    return this.getOrder(order.id, ctx);
  }

  /** Append items to an open order; sends a new KOT; recomputes the total. */
  async addItems(orderId: string, dto: AddItemsDto, _user: AuthUser, ctx: TenantContext) {
    const order = await this.prisma.sale.findFirst({
      where: { id: orderId, organizationId: ctx.orgId, branchId: ctx.branchId, status: SaleStatus.OPEN },
      include: { items: true },
    });
    if (!order) {
      throw new BusinessException('E2001', 'Ochiq buyurtma topilmadi');
    }
    const lines = await this.priceLines(dto.items, ctx);

    await this.prisma.$transaction(async (tx) => {
      for (const l of lines) {
        await tx.saleItem.create({
          data: {
            saleId: order.id,
            productId: l.productId,
            variantId: l.input.variantId,
            qty: l.qty.toPrisma(),
            price: l.unitPrice.toPrisma(),
            cost: l.unitCost.toPrisma(),
            modifiers: l.modifiers as unknown as Prisma.InputJsonValue,
          },
        });
        await this.deductForLine(tx, l, ctx, order.id);
      }
      await this.createKot(tx, order.id, lines);

      // Recompute totals over existing + new items.
      let subtotal = Money.zero();
      for (const it of order.items) subtotal = subtotal.add(Money.of(it.price).multiply(it.qty.toString()).toString());
      for (const l of lines) subtotal = subtotal.add(l.lineTotal.toString());
      const total = subtotal.subtract(Money.of(order.discount).toString());
      await tx.sale.update({
        where: { id: order.id },
        data: { subtotal: subtotal.toPrisma(), total: total.toPrisma() },
      });
    });
    await this.redis.delPattern(`catalog:${ctx.orgId}:${ctx.branchId}:*`);
    return this.getOrder(order.id, ctx);
  }

  /** Open order for a table (or null). */
  async getOpenByTable(tableId: string, ctx: TenantContext) {
    const order = await this.prisma.sale.findFirst({
      where: { tableId, organizationId: ctx.orgId, branchId: ctx.branchId, status: SaleStatus.OPEN },
      include: {
        items: { include: { product: { select: { name: true } } } },
        kots: true,
      },
    });
    return order;
  }

  async getOrder(id: string, ctx: TenantContext) {
    return this.prisma.sale.findFirst({
      where: { id, organizationId: ctx.orgId, branchId: ctx.branchId },
      include: { items: { include: { product: { select: { name: true } } } }, payments: true, kots: true },
    });
  }

  /** Close the bill: take payment, complete the order, free the table. */
  async payOrder(orderId: string, dto: PayOrderDto, user: AuthUser, ctx: TenantContext) {
    const order = await this.prisma.sale.findFirst({
      where: { id: orderId, organizationId: ctx.orgId, branchId: ctx.branchId, status: SaleStatus.OPEN },
    });
    if (!order) {
      throw new BusinessException('E2001', 'Ochiq buyurtma topilmadi');
    }
    const total = Money.of(order.total);
    let paid = Money.zero();
    for (const p of dto.payments) paid = paid.add(p.amount);
    if (!paid.equals(total.toString())) {
      throw new BusinessException('E4001', 'To‘lov summasi jami summaga teng emas', {
        total: total.toString(),
        paid: paid.toString(),
      });
    }
    const cashTotal = dto.payments
      .filter((p) => p.provider === PaymentProvider.CASH)
      .reduce((acc, p) => acc.add(p.amount), Money.zero());
    const cardTotal = total.subtract(cashTotal.toString());

    await this.prisma.$transaction(async (tx) => {
      const shift = await this.shifts.requireOpen(tx, user.id, ctx);
      await tx.payment.createMany({
        data: dto.payments.map((p) => ({
          saleId: order.id,
          provider: p.provider,
          amount: Money.of(p.amount).toPrisma(),
          status: PaymentStatus.SUCCESS,
          idempotencyKey: `${order.id}:${p.provider}:${randomUUID()}`,
        })),
      });
      await tx.sale.update({
        where: { id: order.id },
        data: { status: SaleStatus.COMPLETED, paidStatus: PaidStatus.PAID, shiftId: shift.id, completedAt: new Date() },
      });
      await tx.shift.update({
        where: { id: shift.id },
        data: {
          totalSales: { increment: total.toPrisma() },
          cashSales: { increment: cashTotal.toPrisma() },
          cardSales: { increment: cardTotal.toPrisma() },
        },
      });
      if (order.customerId) {
        const points = Math.floor(total.toNumber() / 1000);
        if (points > 0) {
          await tx.customer.updateMany({
            where: { id: order.customerId, organizationId: ctx.orgId },
            data: { loyaltyPoints: { increment: points } },
          });
        }
      }
      if (order.tableId) {
        await tx.diningTable.updateMany({
          where: { id: order.tableId, organizationId: ctx.orgId, branchId: ctx.branchId },
          data: { status: 'FREE' },
        });
      }
      await tx.auditLog.create({
        data: { staffId: user.id, action: 'ORDER_PAY', entity: 'Sale', entityId: order.id, newValue: { total: total.toString() } as Prisma.InputJsonValue },
      });
    });
    this.logger.log(`Order paid: ${order.id} total=${total.toString()} branch=${ctx.branchId}`);
    return this.getOrder(order.id, ctx);
  }

  /** Cancel an open order: restore stock, free the table. */
  async cancelOrder(orderId: string, user: AuthUser, ctx: TenantContext) {
    const order = await this.prisma.sale.findFirst({
      where: { id: orderId, organizationId: ctx.orgId, branchId: ctx.branchId, status: SaleStatus.OPEN },
      include: { items: { include: { product: { select: { type: true, trackStock: true } } } } },
    });
    if (!order) {
      throw new BusinessException('E2001', 'Ochiq buyurtma topilmadi');
    }
    await this.prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        if (item.product.type === ProductType.DISH) {
          const recipe = await tx.recipe.findUnique({ where: { dishProductId: item.productId }, include: { items: true } });
          for (const ri of recipe?.items ?? []) {
            await this.stock.increase(tx, { organizationId: ctx.orgId, branchId: ctx.branchId, productId: ri.ingredientId, qty: Quantity.of(ri.qty).multiply(item.qty.toString()), refType: 'RETURN', refId: order.id }, 'RETURN');
          }
        } else if (item.product.trackStock) {
          await this.stock.increase(tx, { organizationId: ctx.orgId, branchId: ctx.branchId, productId: item.productId, qty: Quantity.of(item.qty), refType: 'RETURN', refId: order.id }, 'RETURN');
        }
      }
      await tx.sale.update({ where: { id: order.id }, data: { status: SaleStatus.CANCELLED } });
      if (order.tableId) {
        await tx.diningTable.updateMany({ where: { id: order.tableId, organizationId: ctx.orgId, branchId: ctx.branchId }, data: { status: 'FREE' } });
      }
      await tx.auditLog.create({ data: { staffId: user.id, action: 'ORDER_CANCEL', entity: 'Sale', entityId: order.id } });
    });
    await this.redis.delPattern(`catalog:${ctx.orgId}:${ctx.branchId}:*`);
    return { id: order.id, status: 'CANCELLED' };
  }

  /** Build a KOT snapshot from priced lines. */
  private async createKot(tx: Prisma.TransactionClient, saleId: string, lines: PricedLine[]): Promise<void> {
    await tx.kot.create({
      data: {
        saleId,
        items: lines.map((l) => ({
          productId: l.productId,
          name: l.productName,
          qty: l.qty.toNumber(),
          modifiers: l.modifiers,
        })) as unknown as Prisma.InputJsonValue,
      },
    });
  }

  // ─────────────────────── helpers ───────────────────────

  private async priceLines(items: SaleItemInputDto[], ctx: TenantContext): Promise<PricedLine[]> {
    const productIds = [...new Set(items.map((i) => i.productId))];
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, organizationId: ctx.orgId, active: true, deletedAt: null },
      include: {
        variants: true,
        recipe: { include: { items: { include: { ingredient: { select: { cost: true } } } } } },
      },
    });
    const byId = new Map(products.map((p) => [p.id, p]));

    const modifierIds = [...new Set(items.flatMap((i) => i.modifierIds ?? []))];
    const modifiers = modifierIds.length
      ? await this.prisma.modifier.findMany({
          where: { id: { in: modifierIds }, organizationId: ctx.orgId, active: true },
        })
      : [];
    const modById = new Map(modifiers.map((m) => [m.id, m]));

    return items.map((input) => {
      const product = byId.get(input.productId);
      if (!product) {
        throw new BusinessException('E4102', 'Mahsulot katalogda yo‘q yoki nofaol', {
          productId: input.productId,
        });
      }

      let unitPrice = Money.of(product.price);
      if (input.variantId) {
        const variant = product.variants.find((v) => v.id === input.variantId);
        if (!variant) {
          throw new BusinessException('E4102', 'Variant topilmadi');
        }
        unitPrice = unitPrice.add(variant.priceDelta);
      }
      const appliedModifiers = (input.modifierIds ?? []).map((mid) => {
        const m = modById.get(mid);
        if (!m) {
          throw new BusinessException('E4102', 'Modifikator topilmadi');
        }
        unitPrice = unitPrice.add(m.priceDelta);
        return { id: m.id, name: m.name, priceDelta: Money.of(m.priceDelta).toString() };
      });

      const qty = Quantity.of(input.qty);
      const lineTotal = unitPrice.multiply(qty.toString());

      // Recipe (dish) ingredient depletion plan.
      const recipe =
        product.type === ProductType.DISH && product.recipe
          ? product.recipe.items.map((ri) => ({
              ingredientId: ri.ingredientId,
              qty: Quantity.of(ri.qty).multiply(qty.toString()),
            }))
          : [];

      // Cost: dish = sum(ingredient.cost * qty); else product.cost.
      let unitCost = Money.of(product.cost);
      if (product.type === ProductType.DISH && product.recipe) {
        unitCost = product.recipe.items.reduce(
          (acc, ri) => acc.add(Money.of(ri.ingredient.cost).multiply(ri.qty.toString()).toString()),
          Money.zero(),
        );
      }

      return {
        input,
        productId: product.id,
        productName: product.name,
        productType: product.type,
        trackStock: product.trackStock,
        unitPrice,
        unitCost,
        qty,
        lineTotal,
        modifiers: appliedModifiers,
        recipe,
      };
    });
  }

  private async deductForLine(
    tx: Prisma.TransactionClient,
    line: PricedLine,
    ctx: TenantContext,
    saleId: string,
  ): Promise<void> {
    if (line.productType === ProductType.DISH) {
      // Deplete ingredients via recipe.
      for (const ing of line.recipe) {
        await this.stock.deduct(tx, {
          organizationId: ctx.orgId,
          branchId: ctx.branchId,
          productId: ing.ingredientId,
          qty: ing.qty,
          refType: 'SALE',
          refId: saleId,
        });
      }
      return;
    }
    if (line.trackStock) {
      await this.stock.deduct(tx, {
        organizationId: ctx.orgId,
        branchId: ctx.branchId,
        productId: line.productId,
        qty: line.qty,
        refType: 'SALE',
        refId: saleId,
      });
    }
  }

  private async resolveDiscount(
    promoCode: string | undefined,
    subtotal: Money,
    ctx: TenantContext,
  ): Promise<Money> {
    if (!promoCode) {
      return Money.zero();
    }
    const discount = await this.prisma.discount.findFirst({
      where: { organizationId: ctx.orgId, promoCode, active: true, deletedAt: null },
    });
    if (!discount) {
      throw new BusinessException('E4401', 'Promokod yaroqsiz');
    }
    const conditions = (discount.conditions as { minTotal?: number }) ?? {};
    if (conditions.minTotal && subtotal.lessThan(conditions.minTotal)) {
      throw new BusinessException('E4401', 'Chegirma sharti bajarilmadi');
    }
    const value =
      discount.type === 'PERCENT'
        ? subtotal.percent(discount.value)
        : Money.of(discount.value);
    // Discount can't exceed the subtotal.
    return value.greaterThan(subtotal.toString()) ? subtotal : value;
  }
}
