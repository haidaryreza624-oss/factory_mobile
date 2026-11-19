import { describe, expect, it } from 'vitest';

import {
  calculateCostPerKgAfn,
  calculateExpectedOutputGrams,
  calculateProductionMetrics,
} from '../production';

describe('production calculations', () => {
  it('calculates additive expected output', () => {
    expect(calculateExpectedOutputGrams(100_000, 950)).toBe(95_000);
    expect(calculateExpectedOutputGrams(50_000, 900)).toBe(45_000);
  });

  it('calculates expected, actual and additional loss', () => {
    expect(calculateProductionMetrics(150_000, 140_000, 137_000)).toEqual({
      expectedLossGrams: 10_000,
      actualLossGrams: 13_000,
      additionalLossGrams: 3_000,
    });
  });

  it('calculates batch cost per kilogram', () => {
    expect(calculateCostPerKgAfn(137_000, 137_000)).toBe(1_000);
    expect(calculateCostPerKgAfn(0, 0)).toBe(0);
  });
});
