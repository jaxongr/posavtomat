import { Injectable } from '@nestjs/common';
import { Prisma, StockMovementType } from '@prisma/client';
import { BusinessException } from '../../common/exceptions/business.exception';
import { Quantity } from '../../common/money/quantity';

export interface StockChange {
  branchId: string;
  organizationId: string;
  productId: string;
  qty: Quantity; // positive amount
  refType: string;
  refId?: string;
  note?: string;
}

/**
 * StockManager — the ONLY place stock quantity changes.
 * All methods operate inside a caller-provided transaction so they compose
 * atomically with sales/purchases. Negative stock is impossible: deduction
 * uses a conditional updateMany (quantity >= qty) and throws E4101 otherwise.
 */
@Injectable()
export class StockManager {
  /** Decrease stock atomically. Throws E4101 if insufficient. */
  async deduct(tx: Prisma.TransactionClient, change: StockChange): Promise<void> {
    const qty = change.qty.toPrisma();

    // Ensure a stock row exists (start at 0) so the conditional update is deterministic.
    await tx.stock.upsert({
      where: { branchId_productId: { branchId: change.branchId, productId: change.productId } },
      create: {
        organizationId: change.organizationId,
        branchId: change.branchId,
        productId: change.productId,
        quantity: new Prisma.Decimal(0),
      },
      update: {},
    });

    // Atomic guard: only decrement if enough stock remains.
    const result = await tx.stock.updateMany({
      where: {
        branchId: change.branchId,
        productId: change.productId,
        quantity: { gte: qty },
      },
      data: { quantity: { decrement: qty } },
    });

    if (result.count === 0) {
      throw new BusinessException('E4101', 'Qoldiq yetarli emas', {
        productId: change.productId,
        requested: change.qty.toString(),
      });
    }

    await tx.stockMovement.create({
      data: {
        branchId: change.branchId,
        productId: change.productId,
        type: StockMovementType.SALE,
        qty: change.qty.multiply(-1).toPrisma(),
        refType: change.refType,
        refId: change.refId,
        note: change.note,
      },
    });
  }

  /** Increase stock (purchase receipt or sale return). */
  async increase(
    tx: Prisma.TransactionClient,
    change: StockChange,
    type: StockMovementType = StockMovementType.IN,
  ): Promise<void> {
    const qty = change.qty.toPrisma();
    await tx.stock.upsert({
      where: { branchId_productId: { branchId: change.branchId, productId: change.productId } },
      create: {
        organizationId: change.organizationId,
        branchId: change.branchId,
        productId: change.productId,
        quantity: qty,
      },
      update: { quantity: { increment: qty } },
    });
    await tx.stockMovement.create({
      data: {
        branchId: change.branchId,
        productId: change.productId,
        type,
        qty: change.qty.toPrisma(),
        refType: change.refType,
        refId: change.refId,
        note: change.note,
      },
    });
  }

  /** Set stock to an absolute value (inventory count). Writes ADJUST movement with delta. */
  async adjustTo(
    tx: Prisma.TransactionClient,
    change: Omit<StockChange, 'qty'> & { countedQty: Quantity },
  ): Promise<void> {
    const current = await tx.stock.findUnique({
      where: { branchId_productId: { branchId: change.branchId, productId: change.productId } },
      select: { quantity: true },
    });
    const currentQty = Quantity.of(current?.quantity ?? 0);
    const delta = change.countedQty.subtract(currentQty.toString());

    await tx.stock.upsert({
      where: { branchId_productId: { branchId: change.branchId, productId: change.productId } },
      create: {
        organizationId: change.organizationId,
        branchId: change.branchId,
        productId: change.productId,
        quantity: change.countedQty.toPrisma(),
      },
      update: { quantity: change.countedQty.toPrisma() },
    });

    await tx.stockMovement.create({
      data: {
        branchId: change.branchId,
        productId: change.productId,
        type: StockMovementType.ADJUST,
        qty: delta.toPrisma(),
        refType: change.refType,
        refId: change.refId,
        note: change.note,
      },
    });
  }
}
