import { Prisma } from '@prisma/client';
import { Decimal } from 'decimal.js';

/**
 * Money — centralized monetary arithmetic for UZS.
 *
 * Single source of rounding: 2 decimal places, ROUND_HALF_UP.
 * Float is FORBIDDEN — all math goes through decimal.js.
 * Persisted as Prisma.Decimal (DB: Decimal(14,2)).
 */
const MONEY_DP = 2;
const ROUNDING = Decimal.ROUND_HALF_UP;

export type MoneyInput = number | string | Decimal | Prisma.Decimal;

export class Money {
  private readonly value: Decimal;

  private constructor(value: Decimal) {
    this.value = value.toDecimalPlaces(MONEY_DP, ROUNDING);
  }

  static of(input: MoneyInput): Money {
    return new Money(new Decimal(input.toString()));
  }

  static zero(): Money {
    return new Money(new Decimal(0));
  }

  add(other: MoneyInput): Money {
    return new Money(this.value.plus(new Decimal(other.toString())));
  }

  subtract(other: MoneyInput): Money {
    return new Money(this.value.minus(new Decimal(other.toString())));
  }

  /** Multiply by a quantity (qty may have up to 3 dp). Result rounded to money dp. */
  multiply(qty: MoneyInput): Money {
    return new Money(this.value.times(new Decimal(qty.toString())));
  }

  /** Apply a percentage (e.g. 12 => 12%). */
  percent(pct: MoneyInput): Money {
    return new Money(this.value.times(new Decimal(pct.toString())).dividedBy(100));
  }

  isNegative(): boolean {
    return this.value.isNegative();
  }

  isZero(): boolean {
    return this.value.isZero();
  }

  greaterThan(other: MoneyInput): boolean {
    return this.value.greaterThan(new Decimal(other.toString()));
  }

  lessThan(other: MoneyInput): boolean {
    return this.value.lessThan(new Decimal(other.toString()));
  }

  equals(other: MoneyInput): boolean {
    return this.value.equals(new Decimal(other.toString()));
  }

  /** For persistence — Prisma Decimal. */
  toPrisma(): Prisma.Decimal {
    return new Prisma.Decimal(this.value.toFixed(MONEY_DP));
  }

  toString(): string {
    return this.value.toFixed(MONEY_DP);
  }

  toNumber(): number {
    return this.value.toNumber();
  }
}
