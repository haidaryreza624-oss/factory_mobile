import { describe, expect, it } from 'vitest';

import { calculateSaleLineMinor, calculateSalePaymentStatus } from '../sales';

describe('sale calculations', () => {
  it('calculates line totals from kilograms and per-KG price', () => {
    expect(calculateSaleLineMinor(2_500, 800)).toBe(2_000);
    expect(calculateSaleLineMinor(1_250, 12_000)).toBe(15_000);
  });

  it('derives payment status', () => {
    expect(calculateSalePaymentStatus(20_000, 0)).toBe('unpaid');
    expect(calculateSalePaymentStatus(20_000, 5_000)).toBe('partial');
    expect(calculateSalePaymentStatus(20_000, 20_000)).toBe('paid');
  });
});
