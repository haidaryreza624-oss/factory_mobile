import { describe, expect, it } from 'vitest';

import { calculatePaymentStatus, calculatePurchaseLineMinor } from '../purchases';

describe('purchase calculations', () => {
  it('calculates line totals from grams and per-KG price', () => {
    expect(calculatePurchaseLineMinor(2_500, 500)).toBe(1_250);
    expect(calculatePurchaseLineMinor(1_500, 12_350)).toBe(18_525);
  });

  it('rejects invalid quantities and prices', () => {
    expect(() => calculatePurchaseLineMinor(0, 500)).toThrow(RangeError);
    expect(() => calculatePurchaseLineMinor(1_000, -1)).toThrow(RangeError);
  });

  it('derives unpaid, partial and paid status', () => {
    expect(calculatePaymentStatus(10_000, 0)).toBe('unpaid');
    expect(calculatePaymentStatus(10_000, 3_500)).toBe('partial');
    expect(calculatePaymentStatus(10_000, 10_000)).toBe('paid');
  });
});
