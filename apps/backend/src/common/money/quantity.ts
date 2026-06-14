import { Prisma } from '@prisma/client';
import { Decimal } from 'decimal.js';

/**
 * Quantity — stock/recipe amounts with 3 decimal places (kg, litr fractions).
 * Stock must never go negative — enforced at service layer; this type only
 * guarantees consistent rounding and comparison.
 */
const QTY_DP = 3;
const ROUNDING = Decimal.ROUND_HALF_UP;

export type QtyInput = number | string | Decimal | Prisma.Decimal;

export class Quantity {
  private readonly value: Decimal;

  private constructor(value: Decimal) {
    this.value = value.toDecimalPlaces(QTY_DP, ROUNDING);
  }

  static of(input: QtyInput): Quantity {
    return new Quantity(new Decimal(input.toString()));
  }

  static zero(): Quantity {
    return new Quantity(new Decimal(0));
  }

  add(other: QtyInput): Quantity {
    return new Quantity(this.value.plus(new Decimal(other.toString())));
  }

  subtract(other: QtyInput): Quantity {
    return new Quantity(this.value.minus(new Decimal(other.toString())));
  }

  multiply(factor: QtyInput): Quantity {
    return new Quantity(this.value.times(new Decimal(factor.toString())));
  }

  isNegative(): boolean {
    return this.value.isNegative();
  }

  isZero(): boolean {
    return this.value.isZero();
  }

  lessThan(other: QtyInput): boolean {
    return this.value.lessThan(new Decimal(other.toString()));
  }

  greaterThan(other: QtyInput): boolean {
    return this.value.greaterThan(new Decimal(other.toString()));
  }

  toPrisma(): Prisma.Decimal {
    return new Prisma.Decimal(this.value.toFixed(QTY_DP));
  }

  toString(): string {
    return this.value.toFixed(QTY_DP);
  }

  toNumber(): number {
    return this.value.toNumber();
  }
}
