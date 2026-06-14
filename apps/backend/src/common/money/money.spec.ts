import { Money } from './money';

describe('Money', () => {
  it('rounds to 2 decimals with HALF_UP', () => {
    expect(Money.of('10.005').toString()).toBe('10.01');
    expect(Money.of('10.004').toString()).toBe('10.00');
  });

  it('adds and subtracts without float drift', () => {
    expect(Money.of('0.1').add('0.2').toString()).toBe('0.30');
    expect(Money.of('1000').subtract('999.99').toString()).toBe('0.01');
  });

  it('multiplies by quantity', () => {
    expect(Money.of('12000').multiply('2.5').toString()).toBe('30000.00');
  });

  it('applies percentage', () => {
    expect(Money.of('100000').percent('12').toString()).toBe('12000.00');
  });

  it('compares values', () => {
    expect(Money.of('10').greaterThan('5')).toBe(true);
    expect(Money.of('5').lessThan('10')).toBe(true);
    expect(Money.of('10').equals('10.00')).toBe(true);
  });

  it('detects negative and zero', () => {
    expect(Money.of('-1').isNegative()).toBe(true);
    expect(Money.zero().isZero()).toBe(true);
  });

  it('sums a line of items consistently', () => {
    let total = Money.zero();
    for (let i = 0; i < 3; i++) {
      total = total.add(Money.of('3333.33').toString());
    }
    expect(total.toString()).toBe('9999.99');
  });
});
