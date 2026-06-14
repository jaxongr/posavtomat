import { Injectable } from '@nestjs/common';
import { Prisma, StockMovementType } from '@prisma/client';
import { buildPage } from '../../common/dto/pagination.dto';
import { BusinessException } from '../../common/exceptions/business.exception';
import { Quantity } from '../../common/money/quantity';
import { TenantContext } from '../../common/types/auth.types';
import { PrismaService } from '../../prisma/prisma.service';
import { AdjustStockDto, SetMinQtyDto, StockQueryDto, WasteStockDto } from './dto/inventory.dto';
import { StockManager } from './stock.manager';

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stock: StockManager,
  ) {}

  async findStock(query: StockQueryDto, ctx: TenantContext) {
    const where: Prisma.StockWhereInput = {
      organizationId: ctx.orgId,
      branchId: ctx.branchId,
      ...(query.lowOnly === 'true'
        ? { quantity: { lte: this.prisma.stock.fields.minQuantity } }
        : {}),
    };
    const rows = await this.prisma.stock.findMany({
      where,
      select: {
        id: true,
        quantity: true,
        minQuantity: true,
        product: { select: { id: true, name: true, unit: true, barcode: true } },
      },
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      orderBy: { id: 'asc' },
    });
    return buildPage(rows, query.limit);
  }

  async listMovements(productId: string, ctx: TenantContext) {
    await this.assertProduct(productId, ctx);
    return this.prisma.stockMovement.findMany({
      where: { branchId: ctx.branchId, productId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  /** Inventory count — set absolute quantity, record the delta. */
  async adjust(dto: AdjustStockDto, ctx: TenantContext) {
    await this.assertProduct(dto.productId, ctx);
    await this.prisma.$transaction(async (tx) => {
      await this.stock.adjustTo(tx, {
        organizationId: ctx.orgId,
        branchId: ctx.branchId,
        productId: dto.productId,
        countedQty: Quantity.of(dto.countedQty),
        refType: 'INVENTORY',
        note: dto.note,
      });
    });
    return this.getOne(dto.productId, ctx);
  }

  /** Write-off (waste). Cannot go negative. */
  async waste(dto: WasteStockDto, ctx: TenantContext) {
    await this.assertProduct(dto.productId, ctx);
    await this.prisma.$transaction(async (tx) => {
      const qty = Quantity.of(dto.qty).toPrisma();
      const result = await tx.stock.updateMany({
        where: { branchId: ctx.branchId, productId: dto.productId, quantity: { gte: qty } },
        data: { quantity: { decrement: qty } },
      });
      if (result.count === 0) {
        throw new BusinessException('E4101', 'Qoldiq yetarli emas');
      }
      await tx.stockMovement.create({
        data: {
          branchId: ctx.branchId,
          productId: dto.productId,
          type: StockMovementType.WASTE,
          qty: Quantity.of(dto.qty).multiply(-1).toPrisma(),
          refType: 'WASTE',
          note: dto.note,
        },
      });
    });
    return this.getOne(dto.productId, ctx);
  }

  async setMinQty(dto: SetMinQtyDto, ctx: TenantContext) {
    await this.assertProduct(dto.productId, ctx);
    await this.prisma.stock.upsert({
      where: { branchId_productId: { branchId: ctx.branchId, productId: dto.productId } },
      create: {
        organizationId: ctx.orgId,
        branchId: ctx.branchId,
        productId: dto.productId,
        minQuantity: Quantity.of(dto.minQuantity).toPrisma(),
      },
      update: { minQuantity: Quantity.of(dto.minQuantity).toPrisma() },
    });
    return this.getOne(dto.productId, ctx);
  }

  private async getOne(productId: string, ctx: TenantContext) {
    return this.prisma.stock.findUnique({
      where: { branchId_productId: { branchId: ctx.branchId, productId } },
      include: { product: { select: { id: true, name: true, unit: true } } },
    });
  }

  private async assertProduct(productId: string, ctx: TenantContext): Promise<void> {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, organizationId: ctx.orgId, deletedAt: null },
      select: { id: true },
    });
    if (!product) {
      throw new BusinessException('E4102', 'Mahsulot katalogda yo‘q yoki nofaol');
    }
  }
}
