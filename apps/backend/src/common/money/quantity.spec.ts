import { Quantity } from './quantity';

describe('Quantity', () => {
  it('keeps 3 decimal places (kg)', () => {
    expect(Quantity.of('1.2345').toString()).toBe('1.235');
    expect(Quantity.of('0.001').toString()).toBe('0.001');
  });

  it('subtracts and detects negative (stock guard input)', () => {
    expect(Quantity.of('5').subtract('7').isNegative()).toBe(true);
    expect(Quantity.of('5').subtract('5').isZero()).toBe(true);
  });

  it('multiplies recipe qty by sale qty', () => {
    expect(Quantity.of('0.250').multiply('3').toString()).toBe('0.750');
  });

  it('compares for stock availability', () => {
    expect(Quantity.of('10').lessThan('11')).toBe(true);
    expect(Quantity.of('10').greaterThan('9')).toBe(true);
  });
});
